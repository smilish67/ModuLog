const Meeting = require('../models/Meeting');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');
// STT, 요약 등에 필요한 다른 모듈들 import
const { execSync } = require("child_process");
const { v4: uuidv4 } = require("uuid");
const ragService = require('./ragService');

/**
 * 회의 처리를 위한 비즈니스 로직 서비스
 */
class MeetingService {
  /**
   * 오디오 파일에서 텍스트 추출 및 요약 생성
   * @param {string} meetingId - 처리할 회의 ID
   */
  async processMeeting(meetingId) {
    try {
      // 회의 데이터 가져오기
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        throw new Error('회의를 찾을 수 없습니다.');
      }

      // 1. 음성 파일 STT 처리만 진행
      await this.processTranscription(meeting);
      
      // 요약은 사용자가 화자 설정 후 직접 요청할 때까지 시작하지 않음
      
    } catch (error) {
      console.error('회의 처리 중 오류 발생:', error);
      // 오류 상태 업데이트
      await Meeting.findByIdAndUpdate(meetingId, {
        'transcript.status': 'error',
        'transcript.error': error.message
      });
    }
  }

  /**
   * STT 처리 함수 - 파일을 직접 업로드
   * @param {Object} meeting - 회의 객체
   */
  async processTranscription(meeting) {
    try {
      // STT 상태 업데이트
      meeting.transcript.status = 'processing';
      await meeting.save();

      // Docker 환경에서 호스트 머신의 8000 포트로 접근
      const diarizationUrl ='http://121.140.74.6:8000/diarization/'  // 프로덕션 환경

      console.log(`Diarization 요청 전송: ${diarizationUrl}`);
      console.log('오디오 파일 경로:', meeting.audioFile.path);
      
      // 오디오 파일 경로 확인
      if (!fs.existsSync(meeting.audioFile.path)) {
        throw new Error(`오디오 파일을 찾을 수 없습니다: ${meeting.audioFile.path}`);
      }
      
      // FormData 생성 및 파일 추가
      const formData = new FormData();
      const fileStream = fs.createReadStream(meeting.audioFile.path);
      formData.append('file', fileStream);
      
      // axios를 사용한 요청
      const response = await axios.post(diarizationUrl, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      
      console.log('Diarization 응답 수신:', response.data);
      
      // 처리 결과 업데이트
      meeting.transcript.status = 'completed';
      meeting.transcript.content = response.data;

      // 트랜스크립션이 완료되면 벡터 스토어 생성
      // await ragService.createVectorStore(meeting._id, meeting.transcript.content);


      // segments가 있는 경우 추가 처리
      const segments = response.data.segments || [];
      if (segments.length > 0) {
        // 화자 설정
        await this.setupSpeakers(meeting._id, segments);
      } else {
        console.log('segments 정보가 없거나 비어 있습니다');
      }
      
      await meeting.save();
    } catch (error) {
      console.error('STT 처리 중 오류:', error);
      meeting.transcript.status = 'error';
      meeting.transcript.error = error.message;
      await meeting.save();
      throw error;
    }
  }

  /**
   * 화자 설정 및 기본 이름 할당
   * @param {string} meetingId - 회의 ID
   * @param {Array} segments - 트랜스크립트 세그먼트 배열
   */
  async setupSpeakers(meetingId, segments) {
    try {
      // segments에서 고유한 speaker ID 추출
      const speakerIds = new Set();
      segments.forEach(segment => {
        if (segment.speaker) {
          speakerIds.add(segment.speaker);
        }
      });
      
      // 화자 ID별로 기본 이름 설정
      const speakerNames = {};
      Array.from(speakerIds).forEach(speakerId => {
        speakerNames[speakerId] = `화자 ${speakerId.replace('SPEAKER_', '')}`;
      });
      
      console.log('화자 이름:', speakerNames);
      
      // 화자 이름 설정
      await this.setSpeakerNames(meetingId, speakerNames);
    } catch (error) {
      console.error('화자 설정 중 오류:', error);
      // 화자 설정 실패는 전체 프로세스를 중단시키지 않음
    }
  }

  /**
   * 화자 이름 설정
   * @param {string} meetingId - 회의 ID
   * @param {Object} speakerNames - 화자 ID와 실제 이름 매핑 객체
   * @returns {Object} 업데이트된 회의 객체
   */
  async setSpeakerNames(meetingId, speakerNames) {
    try {
      const meeting = await Meeting.findById(meetingId);
      
      if (!meeting) {
        throw new Error('회의를 찾을 수 없습니다.');
      }
      
      // 화자 이름 저장
      meeting.speakerNames = speakerNames;
      await meeting.save();
      
      return meeting;
    } catch (error) {
      console.error('화자 이름 설정 중 오류:', error);
      throw error;
    }
  }
  
  /**
   * 요약 생성 시작
   * @param {string} meetingId - 회의 ID
   * @returns {Object} 업데이트된 회의 객체
   */
  async initiateSummary(meetingId) {
    try {
      const meeting = await Meeting.findById(meetingId);
      
      if (!meeting) {
        throw new Error('회의를 찾을 수 없습니다.');
      }
      
      // 트랜스크립트 처리가 완료되었는지 확인
      if (meeting.transcript.status !== 'completed') {
        throw new Error('회의 녹취 변환이 완료되지 않았습니다.');
      }
      
      
      // 요약 생성 시작
      meeting.summary.status = 'pending';
      await meeting.save();
      
      // 비동기로 요약 생성 시작
      this.generateSummary(meeting)
        .catch(error => console.error('요약 생성 중 오류:', error));
      
      return meeting;
    } catch (error) {
      console.error('요약 시작 중 오류:', error);
      throw error;
    }
  }

  /**
   * 요약 생성 함수
   * @param {Object} meeting - 회의 객체
   */
  async generateSummary(meeting) {
    try {
      // 이미 트랜스크립트가 처리되지 않았다면 중단
      if (meeting.transcript.status !== 'completed') {
        throw new Error('회의 녹취 변환이 완료되지 않았습니다.');
      }

      // 요약 상태 업데이트
      meeting.summary.status = 'processing';
      await meeting.save();

      // 화자 이름 매핑 적용
      const transcriptData = meeting.transcript.content;
      let processedTranscript = transcriptData;
      let chunks = [];

      if (meeting.summaryStrategy === 'speaker') {
        // end 시간을 기준으로 5분 단위 청크로 나누기
        const CHUNK_SIZE = 5 * 60; // 5분을 초 단위로
        let currentChunk = [];
        let currentChunkEndTime = CHUNK_SIZE;

        if (transcriptData.segments && Array.isArray(transcriptData.segments)) {
          transcriptData.segments.forEach(segment => {
            if (segment.end <= currentChunkEndTime) {
              currentChunk.push(segment);
            } else {
              if (currentChunk.length > 0) {
                chunks.push(currentChunk);
              }
              currentChunk = [segment];
              currentChunkEndTime = Math.ceil(segment.end / CHUNK_SIZE) * CHUNK_SIZE;
            }
          });
          
          // 마지막 청크 추가
          if (currentChunk.length > 0) {
            chunks.push(currentChunk);
          }
        }
      } else {
        // content 모드: 텍스트 길이 기반으로 청크 나누기
        const CHUNK_SIZE = 8000; // 토큰 제한
        let currentChunk = [];
        let currentChunkLength = 0;

        if (transcriptData.segments && Array.isArray(transcriptData.segments)) {
          transcriptData.segments.forEach(segment => {
            const segmentText = segment.text || '';
            const segmentLength = segmentText.length;
            
            if (currentChunkLength + segmentLength <= CHUNK_SIZE) {
              currentChunk.push(segment);
              currentChunkLength += segmentLength;
            } else {
              if (currentChunk.length > 0) {
                chunks.push(currentChunk);
              }
              currentChunk = [segment];
              currentChunkLength = segmentLength;
            }
          });
          
          // 마지막 청크 추가
          if (currentChunk.length > 0) {
            chunks.push(currentChunk);
          }
        } else {
          console.warn('transcriptData.segments가 없거나 배열이 아닙니다:', transcriptData);
          throw new Error('올바른 형식의 트랜스크립트 데이터가 아닙니다.');
        }
      }

      // segments 배열이 있는 경우 (일반적인 diarization 결과 형식)
      if (transcriptData.segments && Array.isArray(transcriptData.segments)) {
        processedTranscript = chunks.map(chunk => {
          return chunk.map(segment => {
            const speakerId = segment.speaker_id || segment.speaker;
            let speakerName = speakerId;
            
            // 화자 이름 매핑이 있는 경우 적용
            if (meeting.speakerNames && meeting.speakerNames[speakerId]) {
              speakerName = meeting.speakerNames[speakerId];
            }
            return {
              speaker: speakerName,
              text: segment.text || '',
            };
          });
        });
      }

      
      
      // 여기에 실제 요약 생성 로직 (외부 API 호출 등)
      // 요약 전략에 따라 다른 처리
      const summaryStrategy = meeting.summaryStrategy || 'content';
      console.log(`요약 전략: ${summaryStrategy}, 화자 매핑 적용됨`);
      let summaryUrl = '';
      
      // segments만 요약 서버로 전송
      if (summaryStrategy === 'content') {
        summaryUrl = 'https://kkrzfnfacjqphtre.tunnel-pt.elice.io/summary_content';
      } else if (summaryStrategy === 'speaker') {
        summaryUrl = 'https://kkrzfnfacjqphtre.tunnel-pt.elice.io/summary';
      }

      const response = await axios.post(summaryUrl, {
        chunks: processedTranscript,
        strategy: summaryStrategy
      });

      // TTS 요약 읽기
      // 오디오 파일도 보내기
      const ttsUrl = process.env.NODE_ENV === 'development' 
        ? 'http://host.docker.internal:3001/tts'  // Docker 환경에서 호스트 머신 접근
        : process.env.NODE_ENV === 'production'
          ? 'http://121.140.74.6:3001/tts'  // 프로덕션 환경
          : 'http://localhost:3001/tts';  // 로컬 개발 환경

      console.log(`TTS 요청 전송: ${ttsUrl}`);
      try {
        const ttsResponse = await axios.post(ttsUrl, {
          text: response.data.translations,
        });
        console.log('TTS 응답:', ttsResponse.data);
        // download audio file and save
        const audioFileName_ko = `${meeting._id}_tts_ko.wav`;
        const audioFileName_en = `${meeting._id}_tts_en.wav`;
        const audioFileName_zh = `${meeting._id}_tts_zh.wav`;
        const uploadsDir = path.join(__dirname, '../../', 'uploads');
        
        // uploads 디렉토리가 없으면 생성
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        const audioFilePath_ko = path.join(uploadsDir, audioFileName_ko);
        const audioFilePath_en = path.join(uploadsDir, audioFileName_en);
        const audioFilePath_zh = path.join(uploadsDir, audioFileName_zh);

        // URL에서 오디오 파일 다운로드
        const downloadAudio = async (url, filePath) => {
          try {
            // localhost URL을 Docker 호스트 URL로 변환
            const hostUrl = process.env.NODE_ENV === 'development' 
              ? url.replace('localhost', 'host.docker.internal')
              : url;

            const response = await axios({
              method: 'GET',
              url: hostUrl,
              responseType: 'arraybuffer'
            });
            fs.writeFileSync(filePath, response.data);
          } catch (error) {
            console.error('오디오 파일 다운로드 실패:', error.message);
            throw error;
          }
        };

        await Promise.all([
          downloadAudio(ttsResponse.data['Korean'].data[0].url, audioFilePath_ko),
          downloadAudio(ttsResponse.data['English'].data[0].url, audioFilePath_en),
          downloadAudio(ttsResponse.data['Chinese'].data[0].url, audioFilePath_zh)
        ]);
      } catch (error) {
        console.error('TTS 요청 실패:', error.message);
        throw error;
      }
      
      // 처리 결과 업데이트
      meeting.summary.status = 'completed';
      meeting.summary.ko = response.data.translations.korean;
      meeting.summary.en = response.data.translations.english;
      meeting.summary.zh = response.data.translations.chinese;
      
      await meeting.save();
    } catch (error) {
      meeting.summary.status = 'error';
      meeting.summary.error = error.message;
      await meeting.save();
      throw error; // 상위 함수에서 처리하도록 오류 전파
    }
  }

  /**
   * 회의 상태 업데이트를 위한 공통 로직
   * @param {string} meetingId - 회의 ID
   * @param {string} field - 업데이트할 필드 (transcript/summary)
   * @param {Object} data - 업데이트할 데이터 
   * @returns {Object} 업데이트된 회의 객체
   */
  async updateMeetingStatus(meetingId, field, data) {
    const meeting = await Meeting.findById(meetingId);
    
    if (!meeting) {
      throw new Error('회의를 찾을 수 없습니다.');
    }

    // 필드 업데이트
    meeting[field] = data;
    await meeting.save();
    return meeting;
  }

  /**
   * STT 상태 업데이트
   * @param {string} meetingId - 회의 ID
   * @param {Object} data - 업데이트할 트랜스크립트 데이터
   * @returns {Object} 업데이트된 회의 객체
   */
  async updateTranscript(meetingId, data) {
    return this.updateMeetingStatus(meetingId, 'transcript', data);
  }

  /**
   * 요약 상태 업데이트
   * @param {string} meetingId - 회의 ID
   * @param {Object} data - 업데이트할 요약 데이터
   * @returns {Object} 업데이트된 회의 객체
   */
  async updateSummary(meetingId, data) {
    return this.updateMeetingStatus(meetingId, 'summary', data);
  }

  setupTranscript(tabContent, transcriptData, meeting) {
    const transcriptContainer = tabContent.querySelector('.transcript-container');
    if (!transcriptContainer) {
        console.error('트랜스크립트 컨테이너를 찾을 수 없습니다');
        return;
    }
    
    // 기존 내용 비우기
    transcriptContainer.innerHTML = '';
    
    // 데이터 형식 검증 및 변환
    let dataArray = [];
    
    console.log('트랜스크립트 데이터 형식:', typeof transcriptData, transcriptData);
    
    if (Array.isArray(transcriptData)) {
        // 이미 배열 형태인 경우
        dataArray = transcriptData;
    } else if (typeof transcriptData === 'object') {
        // 객체인 경우 구조 파악
        if (transcriptData.segments) {
            // segments 배열이 있는 경우 (일반적인 diarization 결과 형식)
            dataArray = transcriptData.segments.map(segment => {
                const speakerId = segment.speaker_id || segment.speaker;
                let speakerName = speakerId;
                
                // 화자 이름 매핑이 있는 경우 적용
                if (meeting && meeting.speakerNames && meeting.speakerNames[speakerId]) {
                    speakerName = meeting.speakerNames[speakerId];
                }
                
                return {
                    speaker: speakerName,
                    text: segment.text || segment.content || '',
                    start: segment.start || 0,
                    end: segment.end || 0
                };
            });
        } else {
            // 다른 형태의 객체인 경우 키-값 쌍으로 변환
            console.warn('알 수 없는 객체 형식:', transcriptData);
            transcriptContainer.innerHTML = JSON.stringify(transcriptData, null, 2);
            return;
        }
    } else {
        // 배열이나 객체가 아닌 경우 (문자열 등)
        console.warn('트랜스크립트 데이터가 배열이나 객체가 아닙니다:', transcriptData);
        transcriptContainer.innerHTML = String(transcriptData);
        return;
    }
    
    // 나머지 코드는 동일...
  }

  // 요약 처리 완료 후 호출
  async processSummary(meetingId, summaryData, error = null) {
    try {
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        throw new Error('회의를 찾을 수 없습니다');
      }

      if (error) {
        // 에러 발생 시
        meeting.summary.status = 'error';
        meeting.summary.error = error.message || '알 수 없는 오류';
      } else {
        // 성공 시
        meeting.summary.status = 'completed';
        
        // 요약 데이터를 각 언어별로 저장
        if (summaryData) {
          meeting.summary.ko = summaryData.ko || '';
          meeting.summary.en = summaryData.en || '';
          meeting.summary.zh = summaryData.zh || '';
        }
      }

      await meeting.save();
      return meeting;

    } catch (error) {
      logger.error(`요약 처리 오류: ${error.message}`);
      throw error;
    }
  }

  async downloadYoutubeAudio(youtubeUrl) {
    try {
      // 유튜브 URL 유효성 검사
      if (!youtubeUrl) {
        throw new Error('유튜브 URL이 필요합니다.');
      }
      
      // 유튜브 오디오 다운로드
      const audioPath = await downloadYoutubeAudio(youtubeUrl);
      return audioPath;
    } catch (error) {
      console.error('유튜브 오디오 다운로드 오류:', error);
      throw error;
    }
  }
}

module.exports = new MeetingService();

function downloadYoutubeAudio(youtubeUrl, outputDir = "uploads") {
  if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
  }

  const baseName = uuidv4();
  const outputPath = path.join(outputDir, `${baseName}.%(ext)s`);
  const finalPath = path.join(outputDir, `${baseName}.wav`);

  const command = `yt-dlp --extract-audio --audio-format wav -o "${outputPath}" "${youtubeUrl}"`;

  console.log(`[YT-DLP] Downloading audio from: ${youtubeUrl}`);
  execSync(command, { stdio: "inherit" });

  if (!fs.existsSync(finalPath)) {
      throw new Error("다운로드 실패: .wav 파일이 존재하지 않습니다.");
  }

  return finalPath;
}
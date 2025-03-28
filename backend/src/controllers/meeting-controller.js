const Meeting = require('../models/Meeting');
const meetingService = require('../services/meeting-service');
const ragService = require('../services/ragService');
const fs = require('fs');
const path = require('path');
// 필요한 다른 모듈들

/**
 * 회의 관련 컨트롤러
 */
class MeetingController {
  /**
   * 회의 파일 업로드 및 초기 처리
   */
  async uploadMeeting(req, res) {
    let meeting;
    try {
      if (!req.file) {
        return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
      }

      const { meetingTitle, summaryStrategy } = req.body;

      if (!meetingTitle) {
        return res.status(400).json({ error: '회의 제목이 필요합니다.' });
      }

      // MongoDB에 회의 데이터 저장
      meeting = new Meeting({
        title: meetingTitle,
        audioFile: {
          filename: req.file.filename,
          originalname: req.file.originalname,
          path: req.file.path,
          status: 'uploading'
        },
        summaryStrategy,
        transcript: { status: 'pending' },
        summary: { status: 'not_started' }
      });

      await meeting.save();

      // 파일 업로드 완료 상태 업데이트
      meeting.audioFile.status = 'completed';
      await meeting.save();

      // 비동기 처리는 서비스 레이어에 위임
      meetingService.processMeeting(meeting._id);
      
      // 오디오 파일 URL 생성
      const audioFileUrl = `/uploads/${req.file.filename}?t=${Date.now()}`;
      
      // // 트랜스크립션 처리 시작
      // const transcript = await meetingService.processAudio(meeting._id, req.file.path);
      

      res.json({
        message: '파일이 성공적으로 업로드되었습니다.',
        meetingId: meeting._id,
        audioFile: meeting.audioFile,
        audioFileUrl: audioFileUrl,
        transcript: meeting.transcript,
        summary: meeting.summary
      });
    } catch (error) {
      console.error('업로드 에러:', error);
      
      // 에러 발생 시 상태 업데이트
      if (meeting) {
        meeting.audioFile.status = 'error';
        meeting.audioFile.error = error.message;
        await meeting.save();
      }
      
      res.status(500).json({ 
        error: '파일 업로드 중 오류가 발생했습니다.',
        details: error.message
      });
    }
  }

  /**
   * 회의 목록 조회
   */
  async getMeetings(req, res) {
    try {
      const meetings = await Meeting.find().sort({ createdAt: -1 });
      res.json(meetings);
    } catch (error) {
      console.error('회의 목록 조회 에러:', error);
      res.status(500).json({ error: '회의 목록을 가져오는 중 오류가 발생했습니다.' });
    }
  }

  /**
   * 특정 회의 조회
   */
  async getMeeting(req, res) {
    try {
      const meeting = await Meeting.findById(req.params.meetingId);
      if (!meeting) {
        return res.status(404).json({ error: '회의를 찾을 수 없습니다.' });
      }
      
      // 응답 데이터에 오디오 파일 URL 추가
      const responseData = meeting.toObject();
      if (meeting.audioFile && meeting.audioFile.filename) {
        responseData.audioFileUrl = `/uploads/${meeting.audioFile.filename}?t=${Date.now()}`;
      }
      
      res.json(responseData);
    } catch (error) {
      console.error('회의 조회 에러:', error);
      res.status(500).json({ error: '회의 정보를 가져오는 중 오류가 발생했습니다.' });
    }
  }

  /**
   * 화자 이름 설정
   */
  async setSpeakerNames(req, res) {
    try {
      const { speakerNames } = req.body;
      
      if (!speakerNames || typeof speakerNames !== 'object') {
        return res.status(400).json({ error: '올바른 화자 정보가 필요합니다.' });
      }
      
      const meetingId = req.params.meetingId;
      const updatedMeeting = await meetingService.setSpeakerNames(meetingId, speakerNames);
      
      res.json({
        message: '화자 이름이 성공적으로 설정되었습니다.',
        meeting: updatedMeeting
      });
    } catch (error) {
      console.error('화자 이름 설정 에러:', error);
      res.status(error.message === '회의를 찾을 수 없습니다.' ? 404 : 500).json({ 
        error: error.message === '회의를 찾을 수 없습니다.' 
          ? error.message 
          : '화자 이름 설정 중 오류가 발생했습니다.'
      });
    }
  }
  
  /**
   * 요약 생성 시작
   */
  async initiateSummary(req, res) {
    try {
      const meetingId = req.params.meetingId;
      const updatedMeeting = await meetingService.initiateSummary(meetingId);
      
      res.json({
        message: '요약 생성이 시작되었습니다.',
        meeting: updatedMeeting
      });
    } catch (error) {
      console.error('요약 시작 에러:', error);
      res.status(error.message === '회의를 찾을 수 없습니다.' ? 404 : 500).json({ 
        error: error.message === '회의를 찾을 수 없습니다.' || error.message === '회의 녹취 변환이 완료되지 않았습니다.'
          ? error.message 
          : '요약 생성 시작 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * STT 상태 업데이트
   */
  async updateTranscript(req, res) {
    try {
      const { status, content, error } = req.body;
      const data = { status, content, error };
      
      const updatedMeeting = await meetingService.updateTranscript(req.params.meetingId, data);
      res.json(updatedMeeting);
    } catch (error) {
      console.error('STT 상태 업데이트 에러:', error);
      res.status(error.message === '회의를 찾을 수 없습니다.' ? 404 : 500).json({ 
        error: error.message === '회의를 찾을 수 없습니다.' 
          ? error.message 
          : '상태 업데이트 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 요약 상태 업데이트
   */
  async updateSummary(req, res) {
    try {
      const { status, ko, en, zh, error } = req.body;
      const data = { status, ko, en, zh, error };
      
      const updatedMeeting = await meetingService.updateSummary(req.params.meetingId, data);
      res.json(updatedMeeting);
    } catch (error) {
      console.error('요약 상태 업데이트 에러:', error);
      res.status(error.message === '회의를 찾을 수 없습니다.' ? 404 : 500).json({ 
        error: error.message === '회의를 찾을 수 없습니다.' 
          ? error.message 
          : '상태 업데이트 중 오류가 발생했습니다.'
      });
    }
  }

  /**
   * 회의 삭제
   */
  async deleteMeeting(req, res) {
    try {
      const meetingId = req.params.meetingId;
      
      // 회의 찾기
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        return res.status(404).json({ error: '회의를 찾을 수 없습니다.' });
      }
      
      // 오디오 파일 삭제
      if (meeting.audioFile && meeting.audioFile.path) {
        try {
          fs.unlinkSync(meeting.audioFile.path);
          console.log(`오디오 파일 삭제됨: ${meeting.audioFile.path}`);
        } catch (fileError) {
          console.error('오디오 파일 삭제 중 오류:', fileError);
          // 파일 삭제 실패는 전체 삭제 작업을 중단하지 않음
        }
      }
      
      // 회의 문서 삭제
      await Meeting.findByIdAndDelete(meetingId);
      
      // 벡터 스토어 삭제
      await ragService.deleteVectorStore(meetingId);
      
      res.json({ 
        message: '회의가 성공적으로 삭제되었습니다.',
        deletedMeetingId: meetingId
      });
    } catch (error) {
      console.error('회의 삭제 에러:', error);
      res.status(500).json({ error: '회의 삭제 중 오류가 발생했습니다.' });
    }
  }


  async uploadYoutubeMeeting(req, res) {
    try {
      const { youtubeUrl, meetingTitle, summaryStrategy } = req.body;
      
      // 유튜브 URL 유효성 검사
      if (!youtubeUrl) {
        return res.status(400).json({ error: '유튜브 URL이 필요합니다.' });
      }

      // 유튜브 오디오 다운로드
      const audioPath = await meetingService.downloadYoutubeAudio(youtubeUrl);

      // 파일 업로드 처리
      const meeting = new Meeting({
        title: meetingTitle,
        audioFile: {
          filename: audioPath.split('/').pop(),
          originalname: audioPath.split('/').pop(),
          path: audioPath,
          status: 'completed'
        },
        summaryStrategy,
        transcript: { status: 'pending' },
        summary: { status: 'not_started' }  
      });

      await meeting.save();

      // 비동기 처리는 서비스 레이어에 위임
      meetingService.processMeeting(meeting._id);

      // 오디오 파일 URL 생성
      const audioFileUrl = `/uploads/${meeting.audioFile.filename}?t=${Date.now()}`;
      
      res.json({
        message: '유튜브 영상이 성공적으로 업로드되었습니다.',
        meetingId: meeting._id, 
        audioFile: meeting.audioFile,
        audioFileUrl: audioFileUrl,
        transcript: meeting.transcript,
        summary: meeting.summary
      });
    } catch (error) {
      console.error('유튜브 영상 업로드 에러:', error);
      res.status(500).json({ error: '유튜브 영상 업로드 중 오류가 발생했습니다.' });
    }
  }

  /**
   * 회의 데이터를 JSON 파일로 내보내기
   */
  async exportMeetingToJson(req, res) {
    try {
      const meetingId = req.params.meetingId;
      const meeting = await Meeting.findById(meetingId);
      
      if (!meeting) {
        return res.status(404).json({ error: '회의를 찾을 수 없습니다.' });
      }

      // 회의 데이터를 JSON 형식으로 변환
      const meetingData = meeting.toObject();
      
      // 파일명 생성 (회의 제목과 날짜 포함)
      const fileName = `${meeting.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.json`;
      
      // 파일 저장 경로 설정
      const exportDir = path.join(__dirname, '../../exports');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }
      
      const filePath = path.join(exportDir, fileName);
      
      // JSON 파일로 저장
      fs.writeFileSync(filePath, JSON.stringify(meetingData, null, 2), 'utf8');
      
      // 파일 다운로드를 위한 응답
      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error('파일 다운로드 에러:', err);
        }
        // 다운로드 완료 후 임시 파일 삭제
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) {
            console.error('임시 파일 삭제 에러:', unlinkErr);
          }
        });
      });
    } catch (error) {
      console.error('JSON 내보내기 에러:', error);
      res.status(500).json({ error: 'JSON 파일 내보내기 중 오류가 발생했습니다.' });
    }
  }
}

module.exports = new MeetingController(); 
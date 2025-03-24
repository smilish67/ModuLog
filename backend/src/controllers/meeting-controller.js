const Meeting = require('../models/Meeting');
const meetingService = require('../services/meeting-service');
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
        status: 'processing',
        transcript: { status: 'pending' },
        summary: { status: 'pending' }
      });

      await meeting.save();

      // 파일 업로드 완료 상태 업데이트
      meeting.audioFile.status = 'completed';
      await meeting.save();

      // 비동기 처리는 서비스 레이어에 위임
      meetingService.processMeeting(meeting._id);
      
      // 오디오 파일 URL 생성
      const audioFileUrl = `/uploads/${req.file.filename}?t=${Date.now()}`;
      
      res.json({
        message: '파일이 성공적으로 업로드되었습니다.',
        meetingId: meeting._id,
        status: meeting.status,
        audioFile: meeting.audioFile,
        audioFileUrl: audioFileUrl
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
   * 회의 처리 함수 - 오디오 파일에서 텍스트 추출 및 요약 생성
   */
  async processMeeting(meetingId) {
    try {
      // 회의 데이터 가져오기
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) {
        throw new Error('회의를 찾을 수 없습니다.');
      }

      // 1. 음성 파일 STT 처리
      await this.processTranscription(meeting);
      
      // 2. 요약 생성
      await this.generateSummary(meeting);
      
    } catch (error) {
      console.error('회의 처리 중 오류 발생:', error);
      // 오류 상태 업데이트
      await Meeting.findByIdAndUpdate(meetingId, {
        status: 'error',
        'transcript.status': 'error',
        'transcript.error': error.message
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
   * STT 상태 업데이트
   */
  async updateTranscript(req, res) {
    try {
      const { status, content, error } = req.body;
      const meeting = await Meeting.findById(req.params.meetingId);
      
      if (!meeting) {
        return res.status(404).json({ error: '회의를 찾을 수 없습니다.' });
      }

      meeting.transcript = {
        status,
        content,
        error
      };

      // 모든 처리가 완료되었는지 확인
      if (status === 'completed' && meeting.summary.status === 'completed') {
        meeting.status = 'completed';
      } else if (status === 'error' || meeting.summary.status === 'error') {
        meeting.status = 'error';
      }

      await meeting.save();
      res.json(meeting);
    } catch (error) {
      console.error('STT 상태 업데이트 에러:', error);
      res.status(500).json({ error: '상태 업데이트 중 오류가 발생했습니다.' });
    }
  }

  /**
   * 요약 상태 업데이트
   */
  async updateSummary(req, res) {
    try {
      const { status, ko, en, zh, error } = req.body;
      const meeting = await Meeting.findById(req.params.meetingId);
      
      if (!meeting) {
        return res.status(404).json({ error: '회의를 찾을 수 없습니다.' });
      }

      meeting.summary = {
        status,
        ko,
        en,
        zh,
        error
      };

      // 모든 처리가 완료되었는지 확인
      if (status === 'completed' && meeting.transcript.status === 'completed') {
        meeting.status = 'completed';
      } else if (status === 'error' || meeting.transcript.status === 'error') {
        meeting.status = 'error';
      }

      await meeting.save();
      res.json(meeting);
    } catch (error) {
      console.error('요약 상태 업데이트 에러:', error);
      res.status(500).json({ error: '상태 업데이트 중 오류가 발생했습니다.' });
    }
  }

  // 나머지 컨트롤러 메서드들...
  // 다른 라우터 핸들러들도 여기에 추가
}

module.exports = new MeetingController(); 
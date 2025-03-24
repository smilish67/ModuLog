const Meeting = require('../models/Meeting');
// STT, 요약 등에 필요한 다른 모듈들 import

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
   * STT 처리 함수
   * @param {Object} meeting - 회의 객체
   */
  async processTranscription(meeting) {
    try {
      // STT 상태 업데이트
      meeting.transcript.status = 'processing';
      await meeting.save();

      // 여기에 실제 STT 처리 로직 (외부 API 호출 등)
      
      // 처리 결과 업데이트
      meeting.transcript.status = 'completed';
      meeting.transcript.content = '추출된 텍스트 내용';
      
      await meeting.save();
    } catch (error) {
      meeting.transcript.status = 'error';
      meeting.transcript.error = error.message;
      await meeting.save();
      throw error; // 상위 함수에서 처리하도록 오류 전파
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

      // 여기에 실제 요약 생성 로직 (외부 API 호출 등)
      
      // 처리 결과 업데이트
      meeting.summary.status = 'completed';
      meeting.summary.ko = '한국어 요약';
      meeting.summary.en = 'English summary';
      meeting.summary.zh = '中文摘要';
      
      // 전체 상태 업데이트
      meeting.status = 'completed';
      await meeting.save();
    } catch (error) {
      meeting.summary.status = 'error';
      meeting.summary.error = error.message;
      meeting.status = 'error';
      await meeting.save();
      throw error; // 상위 함수에서 처리하도록 오류 전파
    }
  }
}

module.exports = new MeetingService(); 
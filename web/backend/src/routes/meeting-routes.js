const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meeting-controller');


// 회의 목록 조회
router.get('/', meetingController.getMeetings);

// 특정 회의 조회
router.get('/:meetingId', meetingController.getMeeting);

// 화자 이름 설정
router.post('/:meetingId/speakers', meetingController.setSpeakerNames);

// 요약 생성 시작
router.post('/:meetingId/summary', meetingController.initiateSummary);

// 트랜스크립트 상태 업데이트
router.put('/:meetingId/transcript', meetingController.updateTranscript);

// 요약 상태 업데이트
router.put('/:meetingId/summary', meetingController.updateSummary);

// 회의 삭제
router.delete('/:meetingId', meetingController.deleteMeeting);

// 회의 데이터 JSON 내보내기
router.get('/:meetingId/export', meetingController.exportMeetingToJson);

module.exports = router; 
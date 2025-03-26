const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// 채팅 메시지 전송
router.post('/send', chatController.sendMessage);

// 채팅 기록 조회
router.get('/history/:meetingId', chatController.getChatHistory);

module.exports = router; 
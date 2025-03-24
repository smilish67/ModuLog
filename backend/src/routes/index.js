"use strict";

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const meetingController = require('../controllers/meeting-controller');

// multer 설정
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // 업로드된 파일이 저장될 디렉토리
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)) // 파일명 설정
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        // 허용할 파일 형식 설정
        const allowedTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/webm'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('지원되지 않는 파일 형식입니다.'));
        }
    },
    limits: {
        fileSize: 100 * 1024 * 1024 // 최대 100MB
    }
});

// 기본 라우트
router.get('/', (req, res) => {
    res.json({ message: 'Modu API 서버가 정상적으로 실행 중입니다.' });
});

// 회의 관련 라우트
router.get('/meetings', meetingController.getMeetings);
router.get('/meetings/:meetingId', meetingController.getMeeting);
router.post('/upload', upload.single('file'), meetingController.uploadMeeting);
router.put('/meetings/:meetingId/transcript', meetingController.updateTranscript);
router.put('/meetings/:meetingId/summary', meetingController.updateSummary);

module.exports = router;
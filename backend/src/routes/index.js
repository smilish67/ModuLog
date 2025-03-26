"use strict";

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const meetingController = require('../controllers/meeting-controller');
const meetingRoutes = require('./meeting-routes');

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
        const allowedTypes = ['audio/wav'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('지원되지 않는 파일 형식입니다.'));
        }
    },
    limits: {
        fileSize: 500 * 1024 * 1024 // 최대 500MB
    }
});

// 기본 라우트
router.get('/', (req, res) => {
    res.json({ message: 'Modu API 서버가 정상적으로 실행 중입니다.' });
});
router.post('/upload', upload.single('file'), meetingController.uploadMeeting);


// 회의 관련 라우트를 /meetings 경로에 마운트
router.use('/meetings', meetingRoutes);

// 기존 직접 정의된 회의 관련 라우트들은 제거
// router.get('/meetings', meetingController.getMeetings); 등 제거

module.exports = router;
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// 환경 변수 로드
dotenv.config();

const app = express();

// 미들웨어 설정
app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// 오직 /api/audio/ 경로만 설정 (기존 /uploads/ 경로는 제거)
app.use('/api/audio', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: function (res, path, stat) {
    if (path.endsWith('.wav')) res.set('Content-Type', 'audio/wav');
    else if (path.endsWith('.mp3')) res.set('Content-Type', 'audio/mpeg');
    else if (path.endsWith('.ogg')) res.set('Content-Type', 'audio/ogg');
    else if (path.endsWith('.webm')) res.set('Content-Type', 'audio/webm');
  }
}));

// MongoDB 연결
console.log('MongoDB 연결 시도:', process.env.MONGODB_URI);
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB 연결 성공');
    console.log('연결된 데이터베이스:', mongoose.connection.db.databaseName);
  })
  .catch((err) => {
    console.error('MongoDB 연결 실패:', err);
    process.exit(1);
  });

// 라우터 설정
app.use('/api', require('./routes'));

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
}); 

module.exports = app;
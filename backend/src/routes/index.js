"use strict";

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.json({ message: 'Modu API 서버가 정상적으로 실행 중입니다.' });
});



module.exports = router;
const chatService = require('../services/chatService');
const pdfService = require('../services/pdfService');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const chatController = {
    // 채팅 메시지 전송 및 응답
    async sendMessage(req, res) {
        try {
            const { meetingId, message } = req.body;
            
            // 질문 분류
            const questionType = await chatService.classifyQuestion(message);
            console.log(questionType);
            let response;
            if (questionType === 'general') {
                response = await chatService.handleGeneralQuestion(message);
            } else {
                response = await chatService.handleMeetingQuestion(message, meetingId);
            }

            res.json({
                success: true,
                response: response
            });

        } catch (error) {
            console.error('채팅 메시지 처리 중 오류:', error);
            res.status(500).json({
                success: false,
                error: '메시지 처리 중 오류가 발생했습니다.'
            });
        }
    },

    async getChatHistory(req, res) {
        try {
            const { meetingId } = req.params;
            
            // TODO: MongoDB에서 채팅 기록 조회
            // 임시로 빈 배열 반환
            res.json({
                success: true,
                history: []
            });

        } catch (error) {
            console.error('채팅 기록 조회 중 오류:', error);
            res.status(500).json({
                success: false,
                error: '채팅 기록 조회 중 오류가 발생했습니다.'
            });
        }
    },

    async generatePDF(req, res) {
        try {
            const { meetingId, meetingContent } = req.body;
            
            const fileName = await pdfService.generateMeetingPDF(meetingId, meetingContent);
            const filePath = path.join(__dirname, '../../uploads', fileName);

            res.download(filePath, fileName, (err) => {
                if (err) {
                    console.error('파일 다운로드 중 오류:', err);
                }
                // 파일 다운로드 후 삭제
                fs.unlink(filePath, (err) => {
                    if (err) {
                        console.error('파일 삭제 중 오류:', err);
                    }
                });
            });

        } catch (error) {
            console.error('PDF 생성 중 오류:', error);
            res.status(500).json({
                success: false,
                error: 'PDF 생성 중 오류가 발생했습니다.'
            });
        }
    }
};

module.exports = chatController; 
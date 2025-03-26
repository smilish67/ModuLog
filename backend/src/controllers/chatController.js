const { ChatOpenAI } = require('langchain/chat_models/openai');
const { HumanMessage, SystemMessage } = require('langchain/schema');

const chatController = {
    // 채팅 메시지 전송 및 응답
    async sendMessage(req, res) {
        try {
            const { meetingId, message } = req.body;
            
            // LangChain 설정
            const chatModel = new ChatOpenAI({
                temperature: 0.7,
                modelName: 'gpt-4-turbo-preview'
            });

            // 시스템 프롬프트 설정
            const systemMessage = new SystemMessage(
                "당신은 회의 내용을 분석하고 도움을 주는 AI 어시스턴트입니다. " +
                "회의 내용을 바탕으로 사용자의 질문에 답변해주세요."
            );

            // 사용자 메시지 생성
            const humanMessage = new HumanMessage(message);

            // AI 응답 생성
            const response = await chatModel.call([
                systemMessage,
                humanMessage
            ]);

            res.json({
                success: true,
                response: response.content
            });

        } catch (error) {
            console.error('채팅 메시지 처리 중 오류:', error);
            res.status(500).json({
                success: false,
                error: '메시지 처리 중 오류가 발생했습니다.'
            });
        }
    },

    // 채팅 기록 조회
    async getChatHistory(req, res) {
        try {
            const { meetingId } = req.params;
            const chat = await Chat.findOne({ meetingId });

            if (!chat) {
                return res.status(404).json({
                    success: false,
                    error: '채팅 기록을 찾을 수 없습니다.'
                });
            }

            res.json({
                success: true,
                messages: chat.messages
            });

        } catch (error) {
            console.error('채팅 기록 조회 중 오류:', error);
            res.status(500).json({
                success: false,
                error: '채팅 기록 조회 중 오류가 발생했습니다.'
            });
        }
    }
};

module.exports = chatController; 
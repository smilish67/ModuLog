const { ChatOpenAI } = require('@langchain/openai');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const { ConversationChain } = require('langchain/chains');
const { BufferMemory } = require('langchain/memory');
const { PromptTemplate } = require('@langchain/core/prompts');
const { RunnableSequence } = require('@langchain/core/runnables');
const ragService = require('./ragService');

class ChatService {
    constructor() {
        this.chatModel = new ChatOpenAI({
            temperature: 0.7,
            modelName: 'gpt-4o-mini',
            apiKey: process.env.OPENAI_API_KEY
        });

        this.chatModelwithRAG = new ChatOpenAI({
            temperature: 0.7,
            modelName: 'gpt-4o',
            apiKey: process.env.OPENAI_API_KEY,
        });

        // 일반 대화를 위한 메모리와 체인 설정
        this.generalMemory = new BufferMemory({
            returnMessages: true,
            memoryKey: "history"
        });

        // 일반 대화를 위한 프롬프트 템플릿
        this.generalPrompt = new PromptTemplate({
            template: "다음 대화 기록을 바탕으로 사용자의 질문에 답변해주세요.\n\n대화 기록:\n{history}\n\n현재 질문: {input}\n\n답변:",
            inputVariables: ["history", "input"]
        });

        this.generalChain = new ConversationChain({
            llm: this.chatModel,
            memory: this.generalMemory,
            prompt: this.generalPrompt,
            verbose: true
        });

        // 질문 분류를 위한 프롬프트 템플릿
        this.classificationPrompt = new PromptTemplate({
            template: "다음 질문이 일반적인 대화인지, 회의 내용과 관련된 전문적인 질문인지 분류해주세요.\n질문: {message}\n응답은 'general' 또는 'meeting' 중 하나로만 해주세요.",
            inputVariables: ["message"]
        });

        // 회의 관련 질문을 위한 프롬프트 템플릿
        this.meetingPrompt = new PromptTemplate({
            template: "다음 회의 내용을 바탕으로 질문에 답변해주세요.\n\n회의 내용:\n{context}\n\n질문: {message}\n\n답변:",
            inputVariables: ["context", "message"]
        });
    }

    async classifyQuestion(message) {
        const chain = RunnableSequence.from([
            this.classificationPrompt,
            this.chatModel
        ]);

        const result = await chain.invoke({ message });
        return result.content.trim().toLowerCase();
    }

    async handleGeneralQuestion(message) {
        const result = await this.generalChain.invoke({
            input: message
        });
        return result.response;
    }

    async handleMeetingQuestion(message, meetingId) {
        try {
            // RAG를 사용하여 관련 컨텍스트 검색
            const { context } = await ragService.retrieveContext(meetingId, message);
            
            // 컨텍스트를 포함한 체인 실행
            const chain = RunnableSequence.from([
                this.meetingPrompt,
                this.chatModelwithRAG
            ]);

            const result = await chain.invoke({
                context,
                message
            });
            
            return result.content;
        } catch (error) {
            console.error('회의 질문 처리 중 오류:', error);
            throw error;
        }
    }
}

module.exports = new ChatService(); 
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { ChatOpenAI } = require('@langchain/openai');
const { PromptTemplate } = require('@langchain/core/prompts');
const { RunnableSequence } = require('@langchain/core/runnables');

class PDFService {
    constructor() {
        this.chatModel = new ChatOpenAI({
            temperature: 0.7,
            modelName: 'gpt-4o-mini',
            apiKey: process.env.OPENAI_API_KEY
        });

        this.summaryPrompt = new PromptTemplate({
            template: "다음 회의 내용을 바탕으로 전문적이고 체계적인 회의록을 작성해주세요.\n\n회의 ID: {meetingId}\n회의 내용: {meetingContent}\n\n다음 형식으로 작성해주세요:\n\n1. 회의 개요\n2. 참석자\n3. 주요 논의 사항\n4. 결정 사항\n5. 후속 조치 사항",
            inputVariables: ["meetingId", "meetingContent"]
        });
    }

    async generateMeetingPDF(meetingId, meetingContent) {
        try {
            // 회의록 내용 생성
            const chain = RunnableSequence.from([
                this.summaryPrompt,
                this.chatModel
            ]);

            const result = await chain.invoke({
                meetingId,
                meetingContent
            });

            const summary = result.content;

            // PDF 생성
            const doc = new PDFDocument();
            const fileName = `meeting_${meetingId}_${Date.now()}.pdf`;
            const filePath = path.join(__dirname, '../../uploads', fileName);
            
            // uploads 디렉토리가 없으면 생성
            if (!fs.existsSync(path.join(__dirname, '../../uploads'))) {
                fs.mkdirSync(path.join(__dirname, '../../uploads'), { recursive: true });
            }

            doc.pipe(fs.createWriteStream(filePath));

            // PDF 스타일 설정
            doc.font('Helvetica-Bold')
               .fontSize(20)
               .text('회의록', { align: 'center' })
               .moveDown();

            doc.font('Helvetica')
               .fontSize(12)
               .text(summary, {
                   align: 'left',
                   lineGap: 10
               });

            doc.end();

            return new Promise((resolve, reject) => {
                doc.on('end', () => resolve(fileName));
                doc.on('error', reject);
            });

        } catch (error) {
            console.error('PDF 생성 중 오류:', error);
            throw error;
        }
    }
}

module.exports = new PDFService(); 
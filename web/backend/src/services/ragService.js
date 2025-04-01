const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { FaissStore } = require('@langchain/community/vectorstores/faiss');
const fs = require('fs');
const path = require('path');

class RAGService {
    constructor() {
        this.embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY
        });
        
        this.textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
            lengthFunction: (text) => text.length,
        });
    }

    async createVectorStore(meetingId, content) {
        try {
            // meetingId를 문자열로 변환
            const meetingIdStr = meetingId.toString();
            
            // content가 객체인 경우 (세그먼트 데이터)
            if (typeof content === 'object' && content.segments) {
                // 세그먼트 데이터를 텍스트로 변환하고 메타데이터 생성
                const docs = [];
                for (const segment of content.segments) {
                    const speaker = segment.speaker || segment.speaker_id || 'Unknown';
                    const text = `[${speaker}]: ${segment.text}`;
                    
                    // 각 세그먼트를 개별 문서로 생성
                    const segmentDocs = await this.textSplitter.createDocuments([text]);
                    
                    // 각 문서에 시간 정보를 메타데이터로 추가
                    segmentDocs.forEach(doc => {
                        doc.metadata = {
                            ...doc.metadata,
                            meetingId: meetingIdStr,
                            speaker,
                            startTime: segment.start,
                            endTime: segment.end,
                            segmentIndex: segment.index
                        };
                    });
                    
                    docs.push(...segmentDocs);
                }
                
                // FAISS 벡터 스토어 생성
                const vectorStore = await FaissStore.fromDocuments(
                    docs,
                    this.embeddings
                );

                // 벡터 스토어 저장
                const storePath = path.join(__dirname, '../../vectorstores', meetingIdStr);
                await vectorStore.save(storePath);

                return true;
            } else if (typeof content === 'string') {
                // 문자열인 경우 기존 로직 사용
                const docs = await this.textSplitter.createDocuments([content]);
                const vectorStore = await FaissStore.fromDocuments(
                    docs,
                    this.embeddings,
                    {
                        metadata: { meetingId: meetingIdStr }
                    }
                );

                const storePath = path.join(__dirname, '../../vectorstores', meetingIdStr);
                await vectorStore.save(storePath);

                return true;
            } else {
                throw new Error('지원하지 않는 content 형식입니다.');
            }
        } catch (error) {
            console.error('벡터 스토어 생성 중 오류:', error);
            throw error;
        }
    }

    async retrieveContext(meetingId, query, k = 3) {
        try {
            // meetingId를 문자열로 변환
            const meetingIdStr = meetingId.toString();
            
            // 저장된 벡터 스토어 로드
            const storePath = path.join(__dirname, '../../vectorstores', meetingIdStr);
            const vectorStore = await FaissStore.load(storePath, this.embeddings);

            // 유사한 내용 검색
            const results = await vectorStore.similaritySearch(query, k);
            
            // 검색 결과를 하나의 문자열로 결합하고 시간 정보 포함
            return results.map(doc => {
                const timeInfo = doc.metadata.startTime ? 
                    ` (${this.formatTime(doc.metadata.startTime)} - ${this.formatTime(doc.metadata.endTime)})` : '';
                return `${doc.pageContent}${timeInfo}`;
            }).join('\n\n');
        } catch (error) {
            console.error('유사 내용 검색 중 오류:', error);
            throw error;
        }
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    async deleteVectorStore(meetingId) {
        try {
            // meetingId를 문자열로 변환
            const meetingIdStr = meetingId.toString();
            
            const storePath = path.join(__dirname, '../../vectorstores', meetingIdStr);
            if (fs.existsSync(storePath)) {
                fs.rmSync(storePath, { recursive: true, force: true });
            }
            return true;
        } catch (error) {
            console.error('벡터 스토어 삭제 중 오류:', error);
            throw error;
        }
    }
}

module.exports = new RAGService(); 
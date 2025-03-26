export class PollingManager {
    constructor(onStatusUpdate, summaryManager) {
        this.pollingInterval = null;
        this.pollingDelay = 5000;
        this.onStatusUpdate = onStatusUpdate;
        this.summaryManager = summaryManager;
        this.processedTranscripts = new Set(); // 이미 처리된 transcription을 추적
        this.currentMeetingId = null; // 현재 폴링 중인 meeting ID 추적
    }

    startPolling(meetingId) {
        if (this.pollingInterval) {
            return;
        }
        
        this.currentMeetingId = meetingId;
        console.log(`회의 상태 폴링 시작: ${meetingId}`);
        
        this.pollingInterval = setInterval(() => {
            this.pollMeetingStatus(meetingId);
        }, this.pollingDelay);
        
        this.pollMeetingStatus(meetingId);
    }

    restartPolling() {
        if (this.currentMeetingId) {
            this.stopPolling();
            this.startPolling(this.currentMeetingId);
        }
    }
    
    stopPolling() {
        if (this.pollingInterval) {
            console.log('회의 상태 폴링 중지');
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }
    
    pollMeetingStatus(meetingId) {
        console.log(`회의 상태 폴링 중: ${meetingId}`);
        
        fetch(`/api/meetings/${meetingId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`서버 응답 오류: ${response.status}`);
                }
                return response.json();
            })
            .then(meeting => {
                console.log(`폴링으로 받은 회의 데이터: 회의 ID ${meetingId}, 트랜스크립션 상태: ${meeting.transcript?.status}, 요약 상태: ${meeting.summary?.status}`);
                
                this.onStatusUpdate(meeting);
                
                // transcription이 완료되었고 아직 처리되지 않은 경우
                if (meeting.transcript?.status === 'completed' && 
                    !this.processedTranscripts.has(meetingId) && 
                    meeting.summary?.status === 'not_started') {
                    
                    console.log(`트랜스크립션이 완료되었습니다. 자동으로 요약을 시작합니다: ${meetingId}`);
                    this.processedTranscripts.add(meetingId);
                    this.summaryManager.startSummary(meetingId, (data) => {
                        console.log('자동 요약 시작 성공:', data);
                    });
                }
                
                const transcriptProcessing = meeting.transcript && 
                                            (meeting.transcript.status === 'processing' || 
                                             meeting.transcript.status === 'pending');
                                             
                const summaryProcessing = meeting.summary && 
                                         (meeting.summary.status === 'processing' || 
                                          meeting.summary.status === 'pending');
                
                if (!transcriptProcessing && !summaryProcessing) {
                    console.log(`회의 처리 완료, 트랜스크립션: ${meeting.transcript?.status}, 요약: ${meeting.summary?.status}, 폴링 중지`);
                    this.stopPolling();
                }
            })
            .catch(error => {
                console.error('회의 상태 폴링 중 오류:', error);
            });
    }
} 
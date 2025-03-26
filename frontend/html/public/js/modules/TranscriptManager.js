export class TranscriptManager {
    constructor() {
        this.messageElements = [];
    }

    setupTranscript(tabContent, transcriptData, meeting, audioPlayer) {
        const transcriptContainer = tabContent.querySelector('.transcript-container');
        if (!transcriptContainer) {
            console.error('트랜스크립트 컨테이너를 찾을 수 없습니다');
            return;
        }
        
        transcriptContainer.innerHTML = '';
        
        let dataArray = [];
        
        console.log('트랜스크립트 데이터 형식:', typeof transcriptData, transcriptData);
        
        if (Array.isArray(transcriptData)) {
            dataArray = transcriptData;
        } else if (typeof transcriptData === 'object') {
            if (transcriptData.segments) {
                dataArray = transcriptData.segments.map(segment => {
                    const speakerId = segment.speaker_id || segment.speaker;
                    let speakerName = segment.speakerName || segment.name || speakerId;

                    if (meeting && meeting.speakerNames && meeting.speakerNames[speakerId]) {
                        speakerName = meeting.speakerNames[speakerId];
                    }
                    
                    return {
                        speaker: speakerName || `화자 ${speakerId || 'unknown'}`,
                        text: segment.text || segment.content || '',
                        start: segment.start || 0,
                        end: segment.end || 0
                    };
                });
            } else {
                console.warn('알 수 없는 객체 형식:', transcriptData);
                transcriptContainer.innerHTML = JSON.stringify(transcriptData, null, 2);
                return;
            }
        } else {
            console.warn('트랜스크립트 데이터가 배열이나 객체가 아닙니다:', transcriptData);
            transcriptContainer.innerHTML = String(transcriptData);
            return;
        }
        
        if (!dataArray || dataArray.length === 0) {
            dataArray = [
                { speaker: "김철수", text: "안녕하세요, 오늘 회의를 시작하겠습니다.", start: 0, end: 3 },
                { speaker: "이영희", text: "네, 안녕하세요.", start: 3, end: 4 },
                { speaker: "박지성", text: "프로젝트 진행 상황을 보고드리겠습니다.", start: 4, end: 7 }
            ];
        }

        this.messageElements = [];

        dataArray.forEach(item => {
            const messageEl = document.createElement('div');
            messageEl.className = 'transcript-message';
            messageEl.dataset.start = item.start;
            messageEl.dataset.end = item.end || (item.start + 5);
            messageEl.innerHTML = `
                <div class="speaker">${item.speaker}</div>
                <div class="message-bubble">${item.text}</div>
                <div class="timestamp">${this.formatTime(item.start)}~${this.formatTime(item.end)}</div>
            `;

            if (audioPlayer) {
                messageEl.addEventListener('click', () => {
                    const duration = audioPlayer.wavesurfer?.getDuration() || 0;
                    if (duration > 0) {
                        audioPlayer.seekTo(item.start / duration);
                        audioPlayer.play();
                    }
                });
            }

            transcriptContainer.appendChild(messageEl);
            this.messageElements.push(messageEl);
        });

        if (audioPlayer && audioPlayer.wavesurfer) {
            this.setupAudioEvents(audioPlayer);
        }
    }

    setupAudioEvents(audioPlayer) {
        audioPlayer.wavesurfer.un('audioprocess');
        audioPlayer.wavesurfer.on('audioprocess', () => {
            const currentTime = audioPlayer.wavesurfer.getCurrentTime();
            this.updateTranscriptHighlight(currentTime);
        });
        
        audioPlayer.wavesurfer.un('seek');
        audioPlayer.wavesurfer.on('seek', () => {
            const currentTime = audioPlayer.wavesurfer.getCurrentTime();
            this.updateTranscriptHighlight(currentTime);
        });
    }

    updateTranscriptHighlight(currentTime) {
        if (!this.messageElements || this.messageElements.length === 0) return;
        
        // 이전 active 메시지의 active 클래스 제거
        this.messageElements.forEach(el => el.classList.remove('active'));
        
        // currentTime보다 start가 큰 첫 번째 메시지 찾기
        const nextMessage = this.messageElements.find(el => {
            const start = parseFloat(el.dataset.start);
            return start > currentTime;
        });
        
        if (nextMessage) {
            // 이전 메시지가 있다면 그것을 active로 설정
            const prevMessage = nextMessage.previousElementSibling;
            if (prevMessage) {
                prevMessage.classList.add('active');
                
                // 스크롤 위치 조정
                const container = prevMessage.closest('.transcript-container');
                if (container) {
                    const elTop = prevMessage.offsetTop;
                    const containerHeight = container.clientHeight;
                    const elHeight = prevMessage.clientHeight;
                    
                    container.scrollTop = elTop - (containerHeight / 2) + (elHeight / 2);
                }
            }
        } else {
            // 마지막 메시지가 active
            const lastMessage = this.messageElements[this.messageElements.length - 1];
            lastMessage.classList.add('active');
            
            // 스크롤 위치 조정
            const container = lastMessage.closest('.transcript-container');
            if (container) {
                const elTop = lastMessage.offsetTop;
                const containerHeight = container.clientHeight;
                const elHeight = lastMessage.clientHeight;
                
                container.scrollTop = elTop - (containerHeight / 2) + (elHeight / 2);
            }
        }
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    createTranscriptSection(meeting) {
        if (meeting.transcript?.status === 'pending' || meeting.transcript?.status === 'processing') {
            return `
                <h2>회의 전문</h2>
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>회의 전문을 생성하고 있습니다...</p>
                </div>
            `;
        } else if (meeting.transcript?.status === 'error') {
            return `
                <h2>회의 전문</h2>
                <div class="error-message">
                    회의 전문 생성 중 오류가 발생했습니다: ${meeting.transcript?.error || '알 수 없는 오류'}
                </div>
            `;
        } else {
            return `
                <h2>회의 전문</h2>
                <div class="full-text-content">
                    <div class="transcript-container">
                    </div>
                </div>
            `;
        }
    }
} 
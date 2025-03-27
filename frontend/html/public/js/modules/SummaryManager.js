export class SummaryManager {
    constructor() {
        this.pollingInterval = null;
        this.pollingDelay = 5000;
        this.pollingManager = null;
    }

    setPollingManager(pollingManager) {
        this.pollingManager = pollingManager;
    }

    formatMarkdown(text) {
        if (!text) return '';
        
        // 주요 섹션을 ## 로 구분
        const sections = text.split('\n\n').map(section => {
            // 각 섹션의 첫 줄을 제목으로 처리
            const lines = section.split('\n');
            if (lines.length > 0) {
                lines[0] = `## ${lines[0]}`;
            }
            return lines.join('\n');
        });
        
        // 전체 텍스트를 마크다운 형식으로 조합
        const markdown = sections.join('\n\n');
        
        // marked.js를 사용하여 HTML로 변환
        return marked.parse(markdown);
    }

    setupSummaryTabs(tabContent) {
        const summaryTabs = tabContent.querySelectorAll('.summary-tab-button');
        summaryTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const lang = tab.dataset.lang;
                // 요약 탭 활성화
                summaryTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const contents = tabContent.querySelectorAll('.summary-content');
                contents.forEach(content => {
                    content.classList.toggle('active', content.dataset.lang === lang);
                });
                
                // TTS 오디오 플레이어 업데이트
                const ttsPlayer = tabContent.querySelector('.tts-audio-player');
                if (ttsPlayer) {
                    ttsPlayer.src = `/api/audio/${tabContent.dataset.meetingId}_tts_${lang}.wav`;
                    ttsPlayer.load();
                    ttsPlayer.play().catch(error => {
                        console.error('TTS 재생 오류:', error);
                    });
                }
            });
        });
    }

    updateTranscriptContent(container, transcriptData) {
        // 기존 내용 비우기
        container.innerHTML = '';
        
        if (Array.isArray(transcriptData)) {
            transcriptData.forEach(segment => {
                const segmentDiv = document.createElement('div');
                segmentDiv.className = 'transcript-segment';
                segmentDiv.innerHTML = `
                    <span class="speaker">${segment.speaker}:</span>
                    <span class="text">${segment.text}</span>
                `;
                container.appendChild(segmentDiv);
            });
        }
    }

    populateSpeakerList(meeting, meetingId) {
        const speakerListContainer = document.getElementById(`speaker-list-${meetingId}`);
        if (!speakerListContainer) return;
        
        const speakers = new Set();
        
        if (meeting.transcript && meeting.transcript.content) {
            const content = meeting.transcript.content;
            
            if (content.segments && Array.isArray(content.segments)) {
                content.segments.forEach(segment => {
                    const speakerId = segment.speaker_id || segment.speaker;
                    if (speakerId) speakers.add(speakerId);
                });
            }
        }
        
        let speakerHtml = '';
        console.log('화자 목록:', meeting.speakerNames);
        speakers.forEach(speakerId => {
            const displayName = (meeting.speakerNames && meeting.speakerNames[speakerId]) || speakerId;
            
            speakerHtml += `
                <div class="speaker-item">
                    <label>${speakerId}:</label>
                    <input type="text" class="speaker-name-input" data-speaker-id="${speakerId}" 
                           placeholder="화자 이름 입력" value="${displayName}">
                </div>
            `;
        });
        
        speakerListContainer.innerHTML = speakerHtml;
    }

    setSpeakerNames(meeting, meetingId, onSuccess) {
        const speakerInputs = document.querySelectorAll(`#speaker-list-${meetingId} .speaker-name-input`);
        if (!speakerInputs.length) return;
        
        const speakerNames = {};
        speakerInputs.forEach(input => {
            const speakerId = input.dataset.speakerId;
            const speakerName = input.value.trim() || speakerId;
            speakerNames[speakerId] = speakerName;
        });
        
        fetch(`/api/meetings/${meetingId}/speakers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ speakerNames })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`서버 오류: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('화자 이름 설정 성공:', data);
            if (onSuccess) onSuccess(data);
        })
        .catch(error => {
            console.error('화자 이름 설정 오류:', error);
            throw error;
        });
    }

    startSummary(meetingId, onSuccess) {
        fetch(`/api/meetings/${meetingId}/summary`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`서버 오류: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('요약 시작 성공:', data);
            if (onSuccess) onSuccess(data);
        })
        .catch(error => {
            console.error('요약 시작 오류:', error);
            throw error;
        });
    }

    createSummarySection(meeting) {
        console.log('요약 섹션 생성:', {
            transcriptStatus: meeting.transcript?.status,
            summaryStatus: meeting.summary?.status,
            meetingId: meeting._id || meeting.id
        });

        if (meeting.transcript?.status !== 'completed') {
            return `
                <h2>회의 요약</h2>
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>트랜스크립션이 완료되면 요약을 시작할 수 있습니다...</p>
                </div>
            `;
        } else if (meeting.summary?.status === 'not_started') {
            return `
                <h2>회의 요약</h2>
                <div class="summary-prepare">
                    <p>트랜스크립션이 완료되었습니다. 화자 이름을 설정하고 요약을 시작하세요.</p>
                    <div class="speaker-mapping-container">
                        <h3>화자 설정</h3>
                        <div class="speaker-list" id="speaker-list-${meeting._id || meeting.id}">
                            <!-- 화자 목록이 여기에 추가됨 -->
                        </div>
                        <div class="summary-actions">
                            <button class="set-speakers-btn" id="set-speakers-btn-${meeting._id || meeting.id}">화자 설정</button>
                            <button class="start-summary-btn" id="start-summary-btn-${meeting._id || meeting.id}">요약 시작</button>
                        </div>
                    </div>
                </div>
            `;
        } else if (meeting.summary?.status === 'pending' || meeting.summary?.status === 'processing') {
            return `
                <h2>회의 요약</h2>
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>요약을 생성하고 있습니다...</p>
                </div>
            `;
        } else if (meeting.summary?.status === 'error') {
            return `
                <h2>회의 요약</h2>
                <div class="error-message">
                    요약 생성 중 오류가 발생했습니다: ${meeting.summary?.error || '알 수 없는 오류'}
                </div>
                <button class="retry-summary-btn" id="retry-summary-btn-${meeting._id || meeting.id}">다시 시도</button>
            `;
        } else if (meeting.summary?.status === 'completed') {
            // content 전략일 경우 마크다운 형식으로 변환
            const formatContent = (text, strategy) => {
                return strategy === 'content' ? this.formatMarkdown(text) : text;
            };

            return `
                <h2>회의 요약</h2>
                <div class="summary-tabs" data-meeting-id="${meeting._id || meeting.id}">
                    <button class="summary-tab-button active" data-lang="ko">한국어</button>
                    <button class="summary-tab-button" data-lang="en">English</button>
                    <button class="summary-tab-button" data-lang="zh">中文</button>
                </div>
                <div class="tts-player-container">
                    <h3>요약 음성</h3>
                    <audio controls class="tts-audio-player">
                        <source src="/api/audio/${meeting._id}_tts_ko.wav" type="audio/wav">
                        브라우저가 오디오 플레이어를 지원하지 않습니다.
                    </audio>
                </div>
                <div class="summary-contents">
                    <div class="summary-content active markdown-body" data-lang="ko">
                        ${formatContent(meeting.summary?.ko || '요약이 없습니다.', meeting.summaryStrategy)}
                    </div>
                    <div class="summary-content markdown-body" data-lang="en">
                        ${formatContent(meeting.summary?.en || 'No summary available.', meeting.summaryStrategy)}
                    </div>
                    <div class="summary-content markdown-body" data-lang="zh">
                        ${formatContent(meeting.summary?.zh || '暂无摘要。', meeting.summaryStrategy)}
                    </div>
                </div>
            `;
        }
        return '';
    }
} 
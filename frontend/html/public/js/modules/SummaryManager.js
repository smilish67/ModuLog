export class SummaryManager {
    constructor() {
        this.pollingInterval = null;
        this.pollingDelay = 5000;
    }

    setupSummaryTabs(tabContent) {
        const summaryTabs = tabContent.querySelectorAll('.summary-tab-button');
        summaryTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const lang = tab.dataset.lang;
                summaryTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const contents = tabContent.querySelectorAll('.summary-content');
                contents.forEach(content => {
                    content.classList.toggle('active', content.dataset.lang === lang);
                });
            });
        });
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
            return `
                <h2>회의 요약</h2>
                <div class="summary-tabs">
                    <button class="summary-tab-button active" data-lang="ko">한국어</button>
                    <button class="summary-tab-button" data-lang="en">English</button>
                    <button class="summary-tab-button" data-lang="zh">中文</button>
                </div>
                <div class="summary-contents">
                    <div class="summary-content active" data-lang="ko">
                        ${meeting.summary?.ko || '요약이 없습니다.'}
                    </div>
                    <div class="summary-content" data-lang="en">
                        ${meeting.summary?.en || 'No summary available.'}
                    </div>
                    <div class="summary-content" data-lang="zh">
                        ${meeting.summary?.zh || '暂无摘要。'}
                    </div>
                </div>
            `;
        }
        return '';
    }
} 
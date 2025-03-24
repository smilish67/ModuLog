import { AudioPlayer } from './audioPlayer.js';

export class TabsManager {
    constructor() {
        this.tabsContainer = document.getElementById('tabsContainer');
        this.tabsContent = document.getElementById('tabsContent');
        this.logoSection = document.querySelector('.logo-section');
        this.activeMeetingId = null;
        this.audioPlayer = null;
        

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.addEventListener('meetingSelected', (e) => {
            this.handleMeetingClick(e.detail);
        });

        document.addEventListener('meetingStatusUpdated', (e) => {
            this.handleMeetingStatusUpdate(e.detail);
        });
    }

    handleMeetingClick(meeting) {
        const meetingId = `${meeting.date}-${meeting.title}`;
        
        this.tabsContainer.classList.add('active');
        this.logoSection.classList.add('hidden');
        
        if (this.activeMeetingId === meetingId) {
            return;
        }

        // 기존 컨텐츠 제거
        this.tabsContent.innerHTML = '';

        // 새 탭 생성
        const tabContent = this.createTabContent(meeting, meetingId);
        this.tabsContent.appendChild(tabContent);
        
        this.activeMeetingId = meetingId;
    }

    handleMeetingStatusUpdate(meeting) {
        const tabContent = document.getElementById(`content-${meeting.id}`);
        if (!tabContent) return;

        // 요약 섹션 업데이트
        const summarySection = tabContent.querySelector('.summary-section');
        if (meeting.status === 'processing') {
            summarySection.innerHTML = `
                <h2>회의 요약</h2>
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>요약을 생성하고 있습니다...</p>
                </div>
            `;
        } else if (meeting.status === 'completed') {
            summarySection.innerHTML = `
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
            this.setupSummaryTabs(tabContent);
        } else if (meeting.status === 'error') {
            summarySection.innerHTML = `
                <h2>회의 요약</h2>
                <div class="error-message">
                    요약 생성 중 오류가 발생했습니다: ${meeting.summary?.error || '알 수 없는 오류'}
                </div>
            `;
        }

        // 회의 전문 섹션 업데이트
        const fullTextSection = tabContent.querySelector('.full-text-section');
        if (meeting.status === 'processing') {
            fullTextSection.innerHTML = `
                <h2>회의 전문</h2>
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>회의 전문을 생성하고 있습니다...</p>
                </div>
            `;
        } else if (meeting.status === 'completed') {
            fullTextSection.innerHTML = `
                <h2>회의 전문</h2>
                <div class="full-text-content">
                    <div class="transcript-container">
                    </div>
                </div>
            `;
            // 트랜스크립트 데이터 처리
            if (meeting.transcript?.data) {
                this.setupTranscript(tabContent, meeting.transcript.data);
            } else if (meeting.transcript?.content) {
                // content가 문자열인 경우 기본 표시
                const transcriptContainer = fullTextSection.querySelector('.transcript-container');
                transcriptContainer.innerHTML = meeting.transcript.content;
            } else {
                const transcriptContainer = fullTextSection.querySelector('.transcript-container');
                transcriptContainer.innerHTML = '회의 전문이 없습니다.';
            }
        } else if (meeting.status === 'error') {
            fullTextSection.innerHTML = `
                <h2>회의 전문</h2>
                <div class="error-message">
                    회의 전문 생성 중 오류가 발생했습니다: ${meeting.transcript?.error || '알 수 없는 오류'}
                </div>
            `;
        }
    }

    createTabContent(meeting, meetingId) {
        const tabContent = document.createElement('div');
        tabContent.className = 'tab-content active';
        tabContent.id = `content-${meetingId}`;
        tabContent.innerHTML = `
            <div class="tab-header">
                <div class="tab-title">
                    <h2>${meeting.title}</h2>
                    <div class="file-name">
                        <i class="fas fa-file-audio"></i>
                        <span>${meeting.title}.wav</span>
                        ${meeting.audioFile?.status === 'uploading' ? `
                            <div class="upload-status uploading">
                                <div class="upload-spinner"></div>
                                <span>업로드 중...</span>
                            </div>
                        ` : meeting.audioFile?.status === 'error' ? `
                            <div class="upload-status error">
                                <i class="fas fa-exclamation-circle"></i>
                                <span>업로드 실패</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="tab-actions">
                    <button>
                        <i class="fas fa-download"></i>
                        다운로드
                    </button>
                    <button>
                        <i class="fas fa-share"></i>
                        공유
                    </button>
                    <button class="close-tab">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="summary-section">
                <h2>회의 요약</h2>
                ${meeting.status === 'processing' ? `
                    <div class="loading-container">
                        <div class="loading-spinner"></div>
                        <p>요약을 생성하고 있습니다...</p>
                    </div>
                ` : meeting.status === 'error' ? `
                    <div class="error-message">
                        요약 생성 중 오류가 발생했습니다: ${meeting.summary?.error || '알 수 없는 오류'}
                    </div>
                ` : `
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
                `}
            </div>
            <div class="full-text-section">
                <h2>회의 전문</h2>
                ${meeting.status === 'processing' ? `
                    <div class="loading-container">
                        <div class="loading-spinner"></div>
                        <p>회의 전문을 생성하고 있습니다...</p>
                    </div>
                ` : meeting.status === 'error' ? `
                    <div class="error-message">
                        회의 전문 생성 중 오류가 발생했습니다: ${meeting.transcript?.error || '알 수 없는 오류'}
                    </div>
                ` : `
                    <div class="full-text-content">
                        <div class="transcript-container">
                        </div>
                    </div>
                `}
            </div>
            <div class="audio-player">
                <div class="audio-player-container">
                    <div id="waveform" class="waveform"></div>
                    <div class="audio-controls">
                        <button id="play-pause" class="play-pause-btn">
                            <i class="fas fa-play"></i>
                        </button>
                        <div class="time-display">
                            <span id="current-time" class="current-time">0:00</span> / <span id="duration" class="duration">0:00</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 기존 AudioPlayer가 있다면 제거
        if (this.activeMeetingId && this.audioPlayer) {
            if (this.audioPlayer.wavesurfer) {
                this.audioPlayer.wavesurfer.destroy();
            }
            this.audioPlayer = null;
        }

        // 새로운 AudioPlayer 초기화
        const audioPlayerContainer = tabContent.querySelector('.audio-player-container');
        const audioPlayer = new AudioPlayer(audioPlayerContainer);
        
        // 오디오 플레이어 저장
        this.audioPlayer = audioPlayer;

        // 오디오 파일 로드 - 상세 회의 정보에서 URL을 가져오거나, 없으면 API에서 가져옵니다
        if (meeting.audioFileUrl) {
            // 직접 업로드한 경우 서버에서 제공한 URL 사용
            console.log('직접 업로드 오디오 URL:', meeting.audioFileUrl);
            
            // URL을 /api/audio/ 형태로 변경
            let fullUrl = meeting.audioFileUrl;
            if (fullUrl.startsWith('/uploads/')) {
                // /uploads/파일명 -> /api/audio/파일명 으로 변경
                const fileName = fullUrl.replace('/uploads/', '');
                fullUrl = `/api/audio/${fileName}`;
            }
            
            // 캐시 방지를 위한 타임스탬프 추가
            fullUrl = `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
            console.log('변환된 오디오 URL:', fullUrl);
            
            audioPlayer.loadAudio(fullUrl);
        } else if (meeting.id) {
            // 기존 회의인 경우 ID로 상세 정보 요청하여 경로 가져오기
            console.log('회의 ID로 오디오 URL 가져오기 시작:', meeting.id);
            fetch(`/api/meetings/${meeting.id}`)
                .then(response => response.json())
                .then(data => {
                    console.log('회의 상세 정보:', data);
                    if (data.audioFile && data.audioFile.filename) {
                        // API 경로로 변경
                        const audioUrl = `/api/audio/${data.audioFile.filename}?t=${Date.now()}`;
                        console.log('생성된 오디오 URL:', audioUrl);
                        audioPlayer.loadAudio(audioUrl);
                    } else {
                        console.error('오디오 파일 정보가 없습니다:', data);
                    }
                })
                .catch(error => {
                    console.error('오디오 파일 정보 가져오기 오류:', error);
                });
        }

        // 탭 닫기 버튼 이벤트 리스너 추가
        const closeTabButton = tabContent.querySelector('.close-tab');
        closeTabButton.addEventListener('click', () => this.closeTab());

        // 요약 탭 전환 이벤트 설정
        if (meeting.status !== 'processing' && meeting.status !== 'error') {
            this.setupSummaryTabs(tabContent);
        }

        // 트랜스크립트 설정
        if (meeting.status === 'completed' && meeting.transcript) {
            if (meeting.transcript.data) {
                this.setupTranscript(tabContent, meeting.transcript.data);
            } else if (meeting.transcript.content) {
                const transcriptContainer = tabContent.querySelector('.transcript-container');
                transcriptContainer.innerHTML = meeting.transcript.content;
            }
        }

        return tabContent;
    }

    setupTranscript(tabContent, transcriptData) {
        const transcriptContainer = tabContent.querySelector('.transcript-container');
        if (!transcriptContainer) {
            console.error('트랜스크립트 컨테이너를 찾을 수 없습니다');
            return;
        }
        
        // 기존 내용 비우기
        transcriptContainer.innerHTML = '';
        
        // 트랜스크립트 데이터가 없으면 기본 예시 데이터 사용
        const data = transcriptData || [
            { speaker: "김철수", text: "안녕하세요, 오늘 회의를 시작하겠습니다.", start: 0, end: 3 },
            { speaker: "이영희", text: "네, 안녕하세요.", start: 3, end: 4 },
            { speaker: "박지성", text: "프로젝트 진행 상황을 보고드리겠습니다.", start: 4, end: 7 }
        ];

        data.forEach(item => {
            const messageEl = document.createElement('div');
            messageEl.className = 'transcript-message';
            messageEl.innerHTML = `
                <div class="speaker">${item.speaker}</div>
                <div class="message-bubble">${item.text}</div>
                <div class="timestamp">${this.formatTime(item.start)}</div>
            `;

            // 오디오 플레이어가 있는 경우에만 클릭 이벤트 추가
            if (this.audioPlayer) {
                messageEl.addEventListener('click', () => {
                    const duration = this.audioPlayer.wavesurfer?.getDuration() || 0;
                    if (duration > 0) {
                        this.audioPlayer.seekTo(item.start / duration);
                        this.audioPlayer.play();
                    }
                });
            }

            transcriptContainer.appendChild(messageEl);
        });
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

    closeTab() {
        if (this.activeMeetingId) {
            this.tabsContent.innerHTML = '';
            
            // AudioPlayer 정리
            if (this.audioPlayer) {
                if (this.audioPlayer.wavesurfer) {
                    this.audioPlayer.wavesurfer.destroy();
                }
                this.audioPlayer = null;
            }
            
            this.activeMeetingId = null;
            this.tabsContainer.classList.remove('active');
            this.logoSection.classList.remove('hidden');
        }
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
} 
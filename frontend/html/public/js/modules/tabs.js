import { AudioPlayer } from './audioPlayer.js';
import { SummaryManager } from './SummaryManager.js';
import { TranscriptManager } from './TranscriptManager.js';
import { PollingManager } from './PollingManager.js';
import { ModalManager } from './ModalManager.js';

export class TabsManager {
    constructor() {
        this.tabsContainer = document.getElementById('tabsContainer');
        this.tabsContent = document.getElementById('tabsContent');
        this.logoSection = document.querySelector('.logo-section');
        this.activeMeetingId = null;
        this.audioPlayer = null;
        this.pollingInterval = null;
        this.pollingDelay = 5000; // 5초마다 폴링
        
        this.summaryManager = new SummaryManager();
        this.transcriptManager = new TranscriptManager();
        this.pollingManager = new PollingManager(this.handleMeetingStatusUpdate.bind(this));
        this.modalManager = new ModalManager();

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
        const meetingId = meeting._id || meeting.id;
        
        this.tabsContainer.classList.add('active');
        this.logoSection.classList.add('hidden');
        
        if (this.activeMeetingId === meetingId) {
            return;
        }
        
        this.pollingManager.stopPolling();
        this.tabsContent.innerHTML = '';

        fetch(`/api/meetings/${meetingId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`서버 응답 오류: ${response.status}`);
                }
                return response.json();
            })
            .then(serverMeeting => {
                console.log('서버에서 가져온 최신 회의 데이터:', serverMeeting);
                
                const updatedMeeting = { ...meeting, ...serverMeeting };
                const tabContent = this.createTabContent(updatedMeeting, meetingId);
                this.tabsContent.appendChild(tabContent);
                
                this.activeMeetingId = meetingId;
                
                const transcriptProcessing = updatedMeeting.transcript && 
                                          (updatedMeeting.transcript.status === 'processing' || 
                                           updatedMeeting.transcript.status === 'pending');
                                           
                const summaryProcessing = updatedMeeting.summary && 
                                       (updatedMeeting.summary.status === 'processing' || 
                                        updatedMeeting.summary.status === 'pending');
                                        
                if (transcriptProcessing || summaryProcessing) {
                    this.pollingManager.startPolling(meetingId);
                }
            })
            .catch(error => {
                console.error('회의 정보 가져오기 오류:', error);
                const tabContent = this.createTabContent(meeting, meetingId);
                this.tabsContent.appendChild(tabContent);
                
                this.activeMeetingId = meetingId;
            });
    }

    handleMeetingStatusUpdate(meeting) {
        const meetingId = meeting._id || meeting.id;
        const tabContent = document.getElementById(`content-${meetingId}`);
        if (!tabContent) return;

        // 액션 버튼 상태 업데이트
        this.updateActionButtons(tabContent, meeting.transcript.status);

        // 요약 섹션 업데이트 (요약 상태가 변경된 경우에만)
        const summarySection = tabContent.querySelector('.summary-section');
        if (summarySection) {
            const currentSummaryStatus = summarySection.dataset.summaryStatus;
            if (currentSummaryStatus !== meeting.summary?.status) {
                summarySection.innerHTML = this.summaryManager.createSummarySection(meeting);
                summarySection.dataset.summaryStatus = meeting.summary?.status;
            }
        }

        // 전문 섹션 업데이트 (트랜스크립트 상태가 변경된 경우에만)
        const fullTextSection = tabContent.querySelector('.full-text-section');
        if (fullTextSection) {
            const currentTranscriptStatus = fullTextSection.dataset.transcriptStatus;
            if (currentTranscriptStatus !== meeting.transcript?.status) {
                fullTextSection.innerHTML = this.transcriptManager.createTranscriptSection(meeting);
                fullTextSection.dataset.transcriptStatus = meeting.transcript?.status;
                
                // 트랜스크립트가 완료된 경우 오디오 플레이어와 연동
                if (meeting.transcript?.status === 'completed') {
                    const transcriptData = meeting.transcript.data || meeting.transcript.content;
                    if (transcriptData) {
                        this.transcriptManager.setupTranscript(tabContent, transcriptData, meeting, this.audioPlayer);
                    }
                }
            }
        }
    }

    updateActionButtons(tabContent, transcriptStatus) {
        const downloadBtn = tabContent.querySelector('.download-btn');
        const shareBtn = tabContent.querySelector('.share-btn');
        const deleteBtn = tabContent.querySelector('.delete-btn');
        
        if (transcriptStatus === 'completed') {
            downloadBtn.classList.remove('disabled');
            shareBtn.classList.remove('disabled');
        } else {
            downloadBtn.classList.add('disabled');
            shareBtn.classList.add('disabled');
        }
        
        // 처리 중인 상태에서는 삭제 비활성화
        if (transcriptStatus === 'processing') {
            deleteBtn.classList.add('disabled');
        } else {
            deleteBtn.classList.remove('disabled');
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
                    <button class="download-btn ${meeting.transcript?.status !== 'completed' ? 'disabled' : ''}">
                        <i class="fas fa-download"></i>
                        다운로드
                    </button>
                    <button class="share-btn ${meeting.transcript?.status !== 'completed' ? 'disabled' : ''}">
                        <i class="fas fa-share"></i>
                        공유
                    </button>
                    <button class="delete-btn ${meeting.transcript?.status === 'processing' || meeting.summary?.status === 'processing' ? 'disabled' : ''}">
                        <i class="fas fa-trash"></i>
                        삭제
                    </button>
                    <button class="close-tab">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            <div class="summary-section" data-summary-status="${meeting.summary?.status || ''}">
                ${this.summaryManager.createSummarySection(meeting)}
            </div>
            <div class="full-text-section" data-transcript-status="${meeting.transcript?.status || ''}">
                ${this.transcriptManager.createTranscriptSection(meeting)}
            </div>
            <div class="audio-player">
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>오디오 파일을 로드하는 중...</p>
                </div>
            </div>
        `;

        // 오디오 파일 로드
        const audioPlayerSection = tabContent.querySelector('.audio-player');
        if (meeting.audioFileUrl) {
            let fullUrl = meeting.audioFileUrl;
            if (fullUrl.startsWith('/uploads/')) {
                const fileName = fullUrl.replace('/uploads/', '');
                fullUrl = `/api/audio/${fileName}`;
            }
            fullUrl = `${fullUrl}${fullUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
            this.initAudioPlayer(audioPlayerSection, fullUrl, tabContent);
        } else if (meetingId && meeting.audioFile && meeting.audioFile.filename) {
            const audioUrl = `/api/audio/${meeting.audioFile.filename}?t=${Date.now()}`;
            this.initAudioPlayer(audioPlayerSection, audioUrl, tabContent);
        } else {
            audioPlayerSection.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>오디오 파일을 찾을 수 없습니다.</p>
                </div>
            `;
        }

        // 이벤트 리스너 설정
        this.setupTabEventListeners(tabContent, meeting, meetingId);

        // 상태에 따라 액션 버튼 초기 설정
        this.updateActionButtons(tabContent, meeting.transcript.status);

        return tabContent;
    }

    setupTabEventListeners(tabContent, meeting, meetingId) {
        const closeTabButton = tabContent.querySelector('.close-tab');
        closeTabButton.addEventListener('click', () => this.closeTab());

        const deleteButton = tabContent.querySelector('.delete-btn');
        deleteButton.addEventListener('click', (e) => {
            if (deleteButton.classList.contains('disabled')) {
                e.preventDefault();
                return;
            }
            this.showDeleteConfirmation(meetingId);
        });

        const downloadButton = tabContent.querySelector('.download-btn');
        downloadButton.addEventListener('click', (e) => {
            if (downloadButton.classList.contains('disabled')) {
                e.preventDefault();
                return;
            }
            console.log('다운로드 버튼 클릭됨');
        });

        const shareButton = tabContent.querySelector('.share-btn');
        shareButton.addEventListener('click', (e) => {
            if (shareButton.classList.contains('disabled')) {
                e.preventDefault();
                return;
            }
            console.log('공유 버튼 클릭됨');
        });

        if (meeting.transcript && meeting.transcript.status === 'completed' &&
            meeting.summary && meeting.summary.status === 'completed') {
            this.summaryManager.setupSummaryTabs(tabContent);
        }

        if (meeting.transcript && meeting.transcript.status === 'completed') {
            const transcriptData = meeting.transcript.data || meeting.transcript.content;
            if (transcriptData) {
                this.transcriptManager.setupTranscript(tabContent, transcriptData, meeting, this.audioPlayer);
            }
        }
        
        if (meeting.transcript && meeting.transcript.status === 'completed' && 
            meeting.summary && meeting.summary.status === 'not_started') {
            setTimeout(() => {
                // 자동으로 요약 시작
                this.summaryManager.startSummary(meetingId, () => {
                    this.pollingManager.startPolling(meetingId);
                });
            }, 100);
        }
        
        if (meeting.summary && meeting.summary.status === 'error') {
            setTimeout(() => {
                const retryBtn = document.getElementById(`retry-summary-btn-${meetingId}`);
                if (retryBtn) {
                    retryBtn.addEventListener('click', () => {
                        this.summaryManager.startSummary(meetingId, () => {
                            this.pollingManager.startPolling(meetingId);
                        });
                    });
                }
            }, 100);
        }
    }

    setupActionButtons(tabContent, meeting) {
        this.updateActionButtons(tabContent, meeting.transcript.status);
    }

    // 오디오 플레이어 초기화 함수 추가
    initAudioPlayer(audioPlayerSection, audioUrl, tabContent) {
        // 오디오 플레이어 생성
        const audioPlayerContainer = document.createElement('div');
        audioPlayerContainer.className = 'audio-player-container';
        audioPlayerContainer.innerHTML = `
            <div id="waveform" class="waveform"></div>
            <div class="audio-controls">
                <button id="play-pause" class="play-pause-btn">
                    <i class="fas fa-play"></i>
                </button>
                <div class="time-display">
                    <span id="current-time" class="current-time">0:00</span> / <span id="duration" class="duration">0:00</span>
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
        
        // AudioPlayer 초기화
        const audioPlayer = new AudioPlayer(audioPlayerContainer);
        this.audioPlayer = audioPlayer;
        
        // 오디오 로드 이벤트 설정
        audioPlayer.onReady = () => {
            // 로딩 컨테이너 제거하고 플레이어 표시
            audioPlayerSection.innerHTML = '';
            audioPlayerSection.appendChild(audioPlayerContainer);
            
            console.log('오디오 플레이어 준비 완료');
        };
        
        audioPlayer.onError = (error) => {
            console.error('오디오 로드 오류:', error);
            audioPlayerSection.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>오디오 파일을 로드하는 중 오류가 발생했습니다.</p>
                </div>
            `;
        };
        
        // 오디오 로드 시작
        audioPlayer.loadAudio(audioUrl);
    }

    closeTab() {
        if (this.activeMeetingId) {
            this.tabsContent.innerHTML = '';
            this.pollingManager.stopPolling();
            
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

    showDeleteConfirmation(meetingId) {
        this.modalManager.showDeleteConfirmation(meetingId, () => {
            this.deleteMeeting(meetingId);
        });
    }
    
    deleteMeeting(meetingId) {
        this.modalManager.showLoadingOverlay('삭제 중...');
        
        fetch(`/api/meetings/${meetingId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`삭제 실패: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('회의 삭제 성공:', data);
            this.closeTab();
            this.modalManager.showNotification('회의가 성공적으로 삭제되었습니다.', 'success');
            document.dispatchEvent(new CustomEvent('meetingDeleted', { 
                detail: { meetingId }
            }));
        })
        .catch(error => {
            console.error('회의 삭제 오류:', error);
            this.modalManager.showNotification(`회의 삭제 실패: ${error.message}`, 'error');
        })
        .finally(() => {
            this.modalManager.hideLoadingOverlay();
        });
    }
} 
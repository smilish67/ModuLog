import { TabsManager } from './tabs.js';
import { AudioPlayer } from './audioPlayer.js';

export class FileUploadManager {
    constructor(tabsManager) {
        this.tabsManager = tabsManager;
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.uploadModal = document.getElementById('uploadModal');
        this.cancelUploadBtn = document.getElementById('cancelUpload');
        this.confirmUploadBtn = document.getElementById('confirmUpload');
        this.supportedFormats = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/webm'];
        this.selectedFile = null;

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropZone.classList.add('dragover');
        });

        this.dropZone.addEventListener('dragleave', () => {
            this.dropZone.classList.remove('dragover');
        });

        this.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropZone.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            this.handleFiles(files);
        });

        this.dropZone.addEventListener('click', () => {
            this.fileInput.click();
        });

        this.fileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            this.handleFiles(files);
        });

        this.cancelUploadBtn.addEventListener('click', () => {
            this.hideModal();
            this.selectedFile = null;
        });

        this.confirmUploadBtn.addEventListener('click', () => {
            this.uploadFile();
        });
    }

    showModal() {
        this.uploadModal.style.display = 'flex';
    }

    hideModal() {
        this.uploadModal.style.display = 'none';
    }

    handleFiles(files) {
        for (const file of files) {
            if (this.supportedFormats.includes(file.type)) {
                this.selectedFile = file;
                this.showModal();
                break;
            } else {
                alert('지원되는 오디오 파일 형식(WAV, MP3, OGG, WEBM)만 업로드할 수 있습니다.');
            }
        }
    }

    uploadFile() {
        const meetingTitle = document.getElementById('meetingTitle').value;
        const summaryStrategy = document.querySelector('input[name="summaryStrategy"]:checked').value;

        if (!meetingTitle.trim()) {
            alert('회의 제목을 입력해주세요.');
            return;
        }

        const formData = new FormData();
        formData.append('file', this.selectedFile);
        formData.append('meetingTitle', meetingTitle);
        formData.append('summaryStrategy', summaryStrategy);

        fetch('/api/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            console.log('서버 응답:', data);
            this.hideModal();
            
            // 업로드된 회의 데이터로 탭 생성
            const meetingData = {
                id: data.meetingId,
                title: meetingTitle,
                date: new Date().toISOString().split('T')[0],
                status: data.status,
                transcript: { status: 'pending' },
                summary: { status: 'pending' },
                audioFileUrl: data.audioFileUrl  // 오디오 파일 URL 추가
            };
            
            // meetingSelected 이벤트 발생
            const event = new CustomEvent('meetingSelected', {
                detail: meetingData
            });
            document.dispatchEvent(event);
            
            // meetingUploaded 이벤트 발생 - 회의 목록을 새로고침하기 위함
            const uploadedEvent = new CustomEvent('meetingUploaded', {
                detail: meetingData
            });
            document.dispatchEvent(uploadedEvent);

            // 회의 상태 주기적으로 확인
            this.checkMeetingStatus(data.meetingId);
        })
        .catch(error => {
            console.error('파일 업로드 오류:', error);
            alert('파일 업로드 중 오류가 발생했습니다.');
        });
    }

    checkMeetingStatus(meetingId) {
        const checkStatus = () => {
            fetch(`/api/meetings/${meetingId}`)
                .then(response => response.json())
                .then(meeting => {
                    if (meeting.status === 'completed' || meeting.status === 'error') {
                        // 처리 완료 또는 에러 발생 시 이벤트 발생
                        const event = new CustomEvent('meetingStatusUpdated', {
                            detail: meeting
                        });
                        document.dispatchEvent(event);
                        return;
                    }
                    
                    // 아직 처리 중이면 계속 확인
                    setTimeout(checkStatus, 5000); // 5초마다 확인
                })
                .catch(error => {
                    console.error('상태 확인 오류:', error);
                });
        };

        checkStatus();
    }
} 
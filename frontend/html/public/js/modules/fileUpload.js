import { TabsManager } from './tabs.js';
import { AudioPlayer } from './audioPlayer.js';
import { ModalManager } from './ModalManager.js';

export class FileUploadManager {
    constructor(tabsManager) {
        this.tabsManager = tabsManager;
        this.modalManager = new ModalManager();
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.uploadModal = document.getElementById('uploadModal');
        this.youtubeModal = document.getElementById('youtubeModal');
        this.cancelUploadBtn = document.getElementById('cancelUpload');
        this.confirmUploadBtn = document.getElementById('confirmUpload');
        this.youtubeUploadBtn = document.getElementById('youtubeUpload');
        this.cancelYoutubeBtn = document.getElementById('cancelYoutube');
        this.confirmYoutubeBtn = document.getElementById('confirmYoutube');
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

        this.youtubeUploadBtn.addEventListener('click', () => {
            this.showYoutubeModal();
        });

        this.cancelYoutubeBtn.addEventListener('click', () => {
            this.hideYoutubeModal();
        });

        this.confirmYoutubeBtn.addEventListener('click', () => {
            this.uploadYoutubeVideo();
        });
    }

    showModal() {
        this.uploadModal.classList.add('show');
    }

    hideModal() {
        this.uploadModal.classList.remove('show');
    }

    showYoutubeModal() {
        this.youtubeModal.classList.add('show');
    }

    hideYoutubeModal() {
        this.youtubeModal.classList.remove('show');
    }

    handleFiles(files) {
        for (const file of files) {
            if (this.supportedFormats.includes(file.type)) {
                this.selectedFile = file;
                this.showModal();
                break;
            } else {
                alert('지원되는 오디오 파일 형식(WAV)만 업로드할 수 있습니다.');
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

        this.modalManager.showLoadingOverlay('파일 업로드 중...');

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
                _id: data.meetingId,
                title: meetingTitle,
                date: new Date().toISOString().split('T')[0],
                audioFile: {
                    status: 'uploading',
                    error: null
                },
                transcript: {
                    status: 'pending',
                    content: null,
                    error: null
                },
                summary: {
                    status: 'not_started',
                    ko: null,
                    en: null,
                    zh: null,
                    error: null
                },
                speakerNames: {},
                summaryStrategy: summaryStrategy
            };
            
            const event = new CustomEvent('meetingSelected', {
                detail: meetingData
            });
            document.dispatchEvent(event);
            
            const uploadedEvent = new CustomEvent('meetingUploaded', {
                detail: meetingData
            });
            document.dispatchEvent(uploadedEvent);
        })
        .catch(error => {
            console.error('파일 업로드 오류:', error);
            alert('파일 업로드 중 오류가 발생했습니다.');
        })
        .finally(() => {
            this.modalManager.hideLoadingOverlay();
        });
    }

    uploadYoutubeVideo() {
        const youtubeUrl = document.getElementById('youtubeUrl').value;
        const meetingTitle = document.getElementById('youtubeMeetingTitle').value;
        const summaryStrategy = document.querySelector('input[name="youtubeSummaryStrategy"]:checked').value;

        if (!youtubeUrl.trim()) {
            alert('유튜브 URL을 입력해주세요.');
            return;
        }

        if (!meetingTitle.trim()) {
            alert('회의 제목을 입력해주세요.');
            return;
        }

        this.modalManager.showLoadingOverlay('유튜브 영상 처리 중...');

        fetch('/api/upload/youtube', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                youtubeUrl,
                meetingTitle,
                summaryStrategy
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('서버 응답:', data);
            this.hideYoutubeModal();
            
            const meetingData = {
                id: data.meetingId,
                _id: data.meetingId,
                title: meetingTitle,
                date: new Date().toISOString().split('T')[0],
                audioFile: {
                    status: 'uploading',
                    error: null
                },
                transcript: {
                    status: 'pending',
                    content: null,
                    error: null
                },
                summary: {
                    status: 'not_started',
                    ko: null,
                    en: null,
                    zh: null,
                    error: null
                },
                speakerNames: {},
                summaryStrategy: summaryStrategy
            };
            
            const event = new CustomEvent('meetingSelected', {
                detail: meetingData
            });
            document.dispatchEvent(event);
            
            const uploadedEvent = new CustomEvent('meetingUploaded', {
                detail: meetingData
            });
            document.dispatchEvent(uploadedEvent);
        })
        .catch(error => {
            console.error('유튜브 영상 처리 오류:', error);
            alert('유튜브 영상 처리 중 오류가 발생했습니다.');
        })
        .finally(() => {
            this.modalManager.hideLoadingOverlay();
        });
    }
} 


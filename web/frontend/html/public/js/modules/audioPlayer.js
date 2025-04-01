export class AudioPlayer {
    constructor(container) {
        this.container = container;
        this.wavesurfer = null;
        this.playPauseBtn = container.querySelector('.play-pause-btn') || container.querySelector('#play-pause');
        this.currentTimeEl = container.querySelector('.current-time') || container.querySelector('#current-time');
        this.durationEl = container.querySelector('.duration') || container.querySelector('#duration');
        
        // 콜백 함수 초기화
        this.onReady = null;
        this.onError = null;
        
        this.initializePlayer();
    }

    initializePlayer() {
        const waveformElement = this.container.querySelector('.waveform') || this.container.querySelector('#waveform');
        
        if (!waveformElement) {
            console.error('Waveform 요소를 찾을 수 없습니다');
            return;
        }
        
        this.wavesurfer = WaveSurfer.create({
            container: waveformElement,
            waveColor: '#e9d5ff',
            progressColor: '#6b21a8',
            cursorColor: '#4c1d95',
            barWidth: 2,
            barRadius: 3,
            cursorWidth: 1,
            height: 100,
            barGap: 3,
            backend: 'MediaElement',
            mediaType: 'audio'
        });

        this.setupEventListeners();
    }

    setupEventListeners() {
        if (!this.playPauseBtn || !this.wavesurfer) {
            console.error('재생/일시정지 버튼 또는 WaveSurfer 인스턴스가 없습니다');
            return;
        }
        
        this.playPauseBtn.addEventListener('click', () => {
            this.wavesurfer.playPause();
            const iconElement = this.playPauseBtn.querySelector('i');
            if (iconElement) {
                iconElement.classList.toggle('fa-play');
                iconElement.classList.toggle('fa-pause');
            }
        });

        this.wavesurfer.on('ready', () => {
            if (this.durationEl) {
                this.durationEl.textContent = this.formatTime(this.wavesurfer.getDuration());
            }
            
            // 준비 완료 콜백 호출
            if (typeof this.onReady === 'function') {
                this.onReady();
            }
        });

        this.wavesurfer.on('audioprocess', () => {
            if (this.currentTimeEl) {
                this.currentTimeEl.textContent = this.formatTime(this.wavesurfer.getCurrentTime());
            }
        });
        
        this.wavesurfer.on('error', error => {
            console.error('오디오 로드 오류:', error);
            
            // 오류 발생 콜백 호출
            if (typeof this.onError === 'function') {
                this.onError(error);
            }
        });
    }

    loadAudio(url) {
        if (this.wavesurfer) {
            console.log('오디오 로드 시도:', url);
            
            try {
                this.wavesurfer.load(url);
            } catch (error) {
                console.error('오디오 로드 실패:', error);
            }
        } else {
            console.error('WaveSurfer 인스턴스가 초기화되지 않았습니다');
        }
    }

    seekTo(position) {
        if (this.wavesurfer) {
            this.wavesurfer.seekTo(position);
        }
    }

    play() {
        if (this.wavesurfer) {
            this.wavesurfer.play();
            const iconElement = this.playPauseBtn?.querySelector('i');
            if (iconElement) {
                iconElement.classList.remove('fa-play');
                iconElement.classList.add('fa-pause');
            }
        }
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}

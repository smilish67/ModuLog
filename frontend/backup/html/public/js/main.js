document.addEventListener('DOMContentLoaded', () => {
    // 요소 선택
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const chatButton = document.getElementById('chatButton');
    const chatContainer = document.getElementById('chatContainer');
    const closeChat = document.getElementById('closeChat');
    const sidebar = document.getElementById('sidebar');
    const chatInput = chatContainer.querySelector('input');
    const chatSendButton = chatContainer.querySelector('button');
    const chatMessages = chatContainer.querySelector('.chat-messages');
    const suggestedMessages = chatContainer.querySelector('.suggested-messages');

    // 추천 대사 목록
    const suggestedPhrases = [
        "주요 논의 사항 알려줘",
        "PDF로 정리해줘"
    ];

    // 추천 대사 렌더링
    function renderSuggestedMessages() {
        suggestedMessages.innerHTML = '';
        suggestedPhrases.forEach(phrase => {
            const messageEl = document.createElement('div');
            messageEl.className = 'suggested-message';
            messageEl.textContent = phrase;
            messageEl.addEventListener('click', () => {
                chatInput.value = phrase;
                chatInput.focus();
            });
            suggestedMessages.appendChild(messageEl);
        });
    }

    // 메시지 전송 함수
    function sendMessage(message) {
        if (!message.trim()) return;
        console.log(message);

        const messageEl = document.createElement('div');
        messageEl.className = 'message sent';
        messageEl.innerHTML = `
            <div class="message-content">${message}</div>
            <div class="message-time">${new Date().toLocaleTimeString()}</div>
        `;
        chatMessages.appendChild(messageEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // 입력창 초기화
        chatInput.value = '';

        // TODO: 서버로 메시지 전송 로직 구현
        console.log('메시지 전송:', message);

        // 임시 응답 메시지 추가
        setTimeout(() => {
            const responseEl = document.createElement('div');
            responseEl.className = 'message received';
            responseEl.innerHTML = `
                <div class="message-content">죄송합니다. 현재 서버와 연결이 되어있지 않아 응답을 드릴 수 없습니다.</div>
                <div class="message-time">${new Date().toLocaleTimeString()}</div>
            `;
            chatMessages.appendChild(responseEl);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 1000);
    }

    // 메시지 전송 이벤트
    chatSendButton.addEventListener('click', () => {
        sendMessage(chatInput.value);
    });

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage(chatInput.value);
        }
    });

    // 드래그 앤 드롭 이벤트
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        handleFiles(files);
    });

    // 클릭으로 파일 선택
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        handleFiles(files);
    });

    // 파일 처리 함수
    function handleFiles(files) {
        for (const file of files) {
            if (file.type === 'audio/wav') {
                // 여기에 파일 업로드 로직 추가
                console.log('WAV 파일이 선택됨:', file.name);
                // TODO: 서버로 파일 전송 로직 구현
            } else {
                alert('WAV 파일만 업로드할 수 있습니다.');
            }
        }
    }

    // 채팅 토글
    let isChatOpen = false;

    chatButton.addEventListener('click', () => {
        isChatOpen = !isChatOpen;
        chatButton.classList.toggle('active');
        chatContainer.classList.toggle('show');
        if (isChatOpen) {
            renderSuggestedMessages();
            chatInput.focus();
        }
    });

    closeChat.addEventListener('click', () => {
        isChatOpen = false;
        chatButton.classList.remove('active');
        chatContainer.classList.remove('show');
    });

    // 사이드바 토글 (예시 회의 목록 추가)
    const meetingList = document.querySelector('.meeting-list');
    
    // 예시 회의 데이터
    const meetings = [
        { date: '2024-03-22', title: '프로젝트 킥오프 미팅' },
        { date: '2024-03-21', title: '주간 회의' },
        { date: '2024-03-20', title: '팀 미팅' },
        { date: '2024-03-15', title: '월간 리뷰' },
        { date: '2024-03-10', title: '기획 미팅' },
        { date: '2024-03-22', title: '프로젝트 킥오프 미팅' },
        { date: '2024-03-21', title: '주간 회의' },
        { date: '2024-03-20', title: '팀 미팅' },
        { date: '2024-03-15', title: '월간 리뷰' },
        { date: '2024-03-10', title: '기획 미팅' },
        { date: '2024-03-22', title: '프로젝트 킥오프 미팅' },
        { date: '2024-03-21', title: '주간 회의' },
        { date: '2024-03-20', title: '팀 미팅' },
        { date: '2024-03-15', title: '월간 리뷰' },
        { date: '2024-03-10', title: '기획 미팅' },
        { date: '2024-03-22', title: '프로젝트 킥오프 미팅' },
        { date: '2024-03-21', title: '주간 회의' },
        { date: '2024-03-20', title: '팀 미팅' },
        { date: '2024-03-15', title: '월간 리뷰' },
        { date: '2024-03-10', title: '기획 미팅' },
        { date: '2024-03-22', title: '프로젝트 킥오프 미팅' },
        { date: '2024-03-21', title: '주간 회의' },
        { date: '2024-03-20', title: '팀 미팅' },
        { date: '2024-03-15', title: '월간 리뷰' },
        { date: '2024-03-10', title: '기획 미팅' },
        { date: '2024-03-22', title: '프로젝트 킥오프 미팅' },
        { date: '2024-03-21', title: '주간 회의' },
        { date: '2024-03-20', title: '팀 미팅' },
        { date: '2024-03-15', title: '월간 리뷰' },
        { date: '2024-03-10', title: '기획 미팅' },
        { date: '2024-03-22', title: '프로젝트 킥오프 미팅' },
        { date: '2024-03-21', title: '주간 회의' },
        { date: '2024-03-20', title: '팀 미팅' },
        { date: '2024-03-15', title: '월간 리뷰' },
        { date: '2024-03-10', title: '기획 미팅' },
        { date: '2024-03-22', title: '프로젝트 킥오프 미팅' },
        { date: '2024-03-21', title: '주간 회의' },
        { date: '2024-03-20', title: '팀 미팅' },
        { date: '2024-03-15', title: '월간 리뷰' },
        { date: '2024-03-10', title: '기획 미팅' },
        { date: '2024-03-22', title: '프로젝트 킥오프 미팅' },
        { date: '2024-03-21', title: '주간 회의' },
        { date: '2024-03-20', title: '팀 미팅' },
        { date: '2024-03-15', title: '월간 리뷰' },
        { date: '2024-03-10', title: '기획 미팅' },
        { date: '2024-03-22', title: '프로젝트 킥오프 미팅' },
        { date: '2024-03-21', title: '주간 회의' },
        { date: '2024-03-20', title: '팀 미팅' },
        { date: '2024-03-15', title: '월간 리뷰' },
        { date: '2024-03-10', title: '기획 미팅' },
        
        // 2025년 3월 23일 최근 회의 목록 더미 추가
        { date: '2025-03-23', title: '프로젝트 킥오프 미팅' },
        { date: '2025-03-22', title: '주간 회의' },
        { date: '2025-03-21', title: '팀 미팅' },
        { date: '2025-03-15', title: '월간 리뷰' },
        { date: '2025-03-10', title: '기획 미팅' },
        { date: '2025-03-05', title: '프로젝트 킥오프 미팅' },
    ];

    // 날짜를 시간대별로 분류하는 함수
    function categorizeMeetings(meetings) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);
        
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        
        const last3Months = new Date(today);
        last3Months.setMonth(last3Months.getMonth() - 3);

        return {
            today: meetings.filter(m => {
                const meetingDate = new Date(m.date);
                meetingDate.setHours(0, 0, 0, 0);
                return meetingDate.getTime() === today.getTime();
            }),
            yesterday: meetings.filter(m => {
                const meetingDate = new Date(m.date);
                meetingDate.setHours(0, 0, 0, 0);
                return meetingDate.getTime() === yesterday.getTime();
            }),
            lastWeek: meetings.filter(m => {
                const meetingDate = new Date(m.date);
                meetingDate.setHours(0, 0, 0, 0);
                return meetingDate < yesterday && meetingDate >= lastWeek;
            }),
            lastMonth: meetings.filter(m => {
                const meetingDate = new Date(m.date);
                meetingDate.setHours(0, 0, 0, 0);
                return meetingDate < lastWeek && meetingDate >= lastMonth;
            }),
            last3Months: meetings.filter(m => {
                const meetingDate = new Date(m.date);
                meetingDate.setHours(0, 0, 0, 0);
                return meetingDate < lastMonth && meetingDate >= last3Months;
            }),
            old: meetings.filter(m => {
                const meetingDate = new Date(m.date);
                meetingDate.setHours(0, 0, 0, 0);
                return meetingDate < last3Months;
            })
        };
    }

    // 회의 목록 렌더링
    function renderMeetings() {
        const categorized = categorizeMeetings(meetings);
        meetingList.innerHTML = '';

        // 오늘의 회의
        if (categorized.today.length > 0) {
            createTimeSection('오늘', categorized.today);
        }

        // 어제의 회의
        if (categorized.yesterday.length > 0) {
            createTimeSection('어제', categorized.yesterday);
        }

        // 지난 7일의 회의
        if (categorized.lastWeek.length > 0) {
            createTimeSection('지난 7일', categorized.lastWeek);
        }

        // 지난 30일의 회의
        if (categorized.lastMonth.length > 0) {
            createTimeSection('지난 30일', categorized.lastMonth);
        }

        // 지난 3개월의 회의
        if (categorized.last3Months.length > 0) {
            createTimeSection('지난 3개월', categorized.last3Months);
        }

        // 오래전 회의
        if (categorized.old.length > 0) {
            createTimeSection('오래전', categorized.old);
        }
    }

    // 시간대 섹션 생성
    function createTimeSection(title, meetings) {
        const section = document.createElement('div');
        section.className = 'time-section';

        const header = document.createElement('div');
        header.className = 'time-section-header';
        header.innerHTML = `
            <span>${title} (${meetings.length})</span>
            <i class="fas fa-chevron-${title === '오늘' || title === '어제' ? 'up' : 'down'}"></i>
        `;

        const content = document.createElement('div');
        content.className = 'time-section-content';
        
        // 오늘과 어제 섹션은 기본적으로 열려있도록 설정
        if (title === '오늘' || title === '어제' || title === '지난 7일') {
            content.classList.add('show');
        }

        meetings.forEach(meeting => {
            const meetingItem = document.createElement('div');
            meetingItem.className = 'meeting-item';
            meetingItem.innerHTML = `
                <div style="font-weight: bold;">${meeting.title}</div>
                <div style="font-size: 0.8em; color: #e9d5ff;">${meeting.date}</div>
            `;
            
            // 클릭 이벤트 추가
            meetingItem.addEventListener('click', () => handleMeetingClick(meeting));
            
            content.appendChild(meetingItem);
        });

        // 토글 기능
        header.addEventListener('click', () => {
            content.classList.toggle('show');
            header.querySelector('i').classList.toggle('fa-chevron-up');
            header.querySelector('i').classList.toggle('fa-chevron-down');
        });

        section.appendChild(header);
        section.appendChild(content);
        meetingList.appendChild(section);
    }

    // 초기 렌더링
    renderMeetings();

    // 탭 관련 요소 선택
    const tabsContainer = document.getElementById('tabsContainer');
    const tabsContent = document.getElementById('tabsContent');
    const logoSection = document.querySelector('.logo-section');
    
    // 활성화된 탭 추적
    let activeMeetingId = null;

    // 회의 아이템 클릭 이벤트 처리
    function handleMeetingClick(meeting) {
        const meetingId = `${meeting.date}-${meeting.title}`;
        
        // 탭 컨테이너 표시 및 로고 섹션 숨김
        tabsContainer.classList.add('active');
        logoSection.classList.add('hidden');
        
        // 이미 열린 탭인 경우 해당 탭 활성화
        if (activeMeetingId === meetingId) {
            return;
        }

        // 기존 탭 컨텐츠 제거
        if (activeMeetingId) {
            const oldContent = document.getElementById(`content-${activeMeetingId}`);
            if (oldContent) {
                oldContent.remove();
            }
        }

        // 새 탭 컨텐츠 생성
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
                <div class="summary-tabs">
                    <button class="summary-tab-button active" data-lang="ko">한국어</button>
                    <button class="summary-tab-button" data-lang="en">English</button>
                    <button class="summary-tab-button" data-lang="zh">中文</button>
                </div>
                <div class="summary-contents">
                    <div class="summary-content active" data-lang="ko">
                        한국어 요약 내용이 여기에 표시됩니다.
                    </div>
                    <div class="summary-content" data-lang="en">
                        English summary will be displayed here.
                    </div>
                    <div class="summary-content" data-lang="zh">
                        中文摘要将在此处显示。
                    </div>
                </div>
            </div>
            <div class="full-text-section">
                <h2>회의 전문</h2>
                <div class="full-text-content">
                    <div class="transcript-container"></div>
                </div>
            </div>
            <div class="audio-player">
                <div class="audio-player-container">
                    <div id="waveform"></div>
                    <div class="audio-controls">
                        <button id="play-pause">
                            <i class="fas fa-play"></i>
                        </button>
                        <div class="time-display">
                            <span id="current-time">0:00</span> / <span id="duration">0:00</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        tabsContent.appendChild(tabContent);

        // Wavesurfer 초기화
        const wavesurfer = WaveSurfer.create({
            container: tabContent.querySelector('#waveform'),
            waveColor: '#e9d5ff',
            progressColor: '#6b21a8',
            cursorColor: '#4c1d95',
            barWidth: 2,
            barRadius: 3,
            cursorWidth: 1,
            height: 100,
            barGap: 3
        });

        // 오디오 파일 로드
        wavesurfer.load(`/audio/${meeting.title}.wav`);

        // 재생/일시정지 버튼 이벤트
        const playPauseBtn = tabContent.querySelector('#play-pause');
        playPauseBtn.addEventListener('click', () => {
            wavesurfer.playPause();
            playPauseBtn.querySelector('i').classList.toggle('fa-play');
            playPauseBtn.querySelector('i').classList.toggle('fa-pause');
        });

        // 시간 표시 업데이트
        const currentTimeEl = tabContent.querySelector('#current-time');
        const durationEl = tabContent.querySelector('#duration');

        wavesurfer.on('ready', () => {
            durationEl.textContent = formatTime(wavesurfer.getDuration());
        });

        wavesurfer.on('audioprocess', () => {
            currentTimeEl.textContent = formatTime(wavesurfer.getCurrentTime());
        });

        // 예시 회의 전문 데이터
        const transcriptData = [
            { speaker: "김철수", text: "안녕하세요, 오늘 회의를 시작하겠습니다.", start: 0, end: 3 },
            { speaker: "이영희", text: "네, 안녕하세요.", start: 3, end: 4 },
            { speaker: "박지성", text: "프로젝트 진행 상황을 보고드리겠습니다.", start: 4, end: 7 }
        ];

        // 회의 전문 렌더링
        const transcriptContainer = tabContent.querySelector('.transcript-container');
        transcriptData.forEach(item => {
            const messageEl = document.createElement('div');
            messageEl.className = 'transcript-message';
            messageEl.innerHTML = `
                <div class="speaker">${item.speaker}</div>
                <div class="message-bubble">${item.text}</div>
                <div class="timestamp">${formatTime(item.start)}</div>
            `;

            // 클릭 이벤트로 해당 시간으로 이동
            messageEl.addEventListener('click', () => {
                wavesurfer.seekTo(item.start / wavesurfer.getDuration());
                wavesurfer.play();
                playPauseBtn.querySelector('i').classList.remove('fa-play');
                playPauseBtn.querySelector('i').classList.add('fa-pause');
            });

            transcriptContainer.appendChild(messageEl);
        });

        // 시간 포맷 함수
        function formatTime(seconds) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.floor(seconds % 60);
            return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        }

        // 탭 관리
        activeMeetingId = meetingId;

        // 탭 닫기 버튼 이벤트 리스너 추가
        const closeTabButton = tabContent.querySelector('.close-tab');
        closeTabButton.addEventListener('click', closeTab);

        // 요약 탭 전환 이벤트 설정
        const summaryTabs = tabContent.querySelectorAll('.summary-tab-button');
        summaryTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const lang = tab.dataset.lang;
                // 활성 탭 변경
                summaryTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                // 컨텐츠 변경
                const contents = tabContent.querySelectorAll('.summary-content');
                contents.forEach(content => {
                    content.classList.toggle('active', content.dataset.lang === lang);
                });
            });
        });
    }

    // 탭 닫기 함수
    function closeTab() {
        if (activeMeetingId) {
            const tabContent = document.getElementById(`content-${activeMeetingId}`);
            if (tabContent) {
                tabContent.remove();
            }
            activeMeetingId = null;
            tabsContainer.classList.remove('active');
            logoSection.classList.remove('hidden');
        }
    }
});
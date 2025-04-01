import { PollingManager } from './PollingManager.js';

export class MeetingsManager {
    constructor(summaryManager) {
        this.meetingList = document.querySelector('.meeting-list');
        this.meetings = []; // 빈 배열로 초기화
        this.pollingIntervals = {}; // 진행 중인 회의 폴링 관리
        this.pollingDelay = 5000; // 5초마다 폴링
        this.summaryManager = summaryManager;

        this.initializeMeetings();
        
        // 파일 업로드 완료 이벤트 리스너 추가
        document.addEventListener('meetingStatusUpdated', () => {
            this.refreshMeetings();
        });
        
        // 새 회의 업로드 완료 이벤트 리스너 추가
        document.addEventListener('meetingUploaded', (e) => {
            this.refreshMeetings();
            
            // 새로 업로드된 회의가 있으면 최신 상태를 확인한 후 폴링 여부 결정
            if (e.detail && e.detail.meetingId) {
                // API를 통해 최신 회의 정보 가져오기
                fetch(`/api/meetings/${e.detail.meetingId}`)
                    .then(response => response.json())
                    .then(meeting => {
                        // 트랜스크립션과 요약 상태 확인
                        const transcriptProcessing = meeting.transcript && 
                                                    (meeting.transcript.status === 'processing' || 
                                                    meeting.transcript.status === 'pending');
                                                    
                        const summaryProcessing = meeting.summary && 
                                                (meeting.summary.status === 'processing' || 
                                                meeting.summary.status === 'pending');
                        
                        // 처리 중인 상태가 있으면 폴링 시작
                        if (transcriptProcessing || summaryProcessing) {
                            this.startPolling(e.detail.meetingId);
                        }
                    })
                    .catch(error => {
                        console.error('회의 정보 가져오기 오류:', error);
                    });
            }
        });
        
        // 회의 삭제 이벤트 리스너 추가
        document.addEventListener('meetingDeleted', (e) => {
            // 삭제된 회의에 대한 폴링 중지
            if (e.detail && e.detail.meetingId) {
                this.stopPolling(e.detail.meetingId);
            }
            
            // 회의 목록 새로고침
            this.refreshMeetings();
        });
    }

    categorizeMeetings(meetings) {
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

    createTimeSection(title, meetings) {
        const section = document.createElement('div');
        section.className = 'time-section';

        const header = document.createElement('div');
        header.className = 'time-section-header';
        header.innerHTML = `
            <span>${title} (${meetings.length})</span>
            <i class="fas fa-chevron-${title === '오늘' || title === '어제' || title === '지난 7일' ? 'down' : 'up'}"></i>
        `;

        const content = document.createElement('div');
        content.className = 'time-section-content';
        
        if (title === '오늘' || title === '어제' || title === '지난 7일') {
            content.classList.add('show');
        }

        meetings.forEach(meeting => {
            const meetingItem = document.createElement('div');
            meetingItem.className = 'meeting-item';
            
            // 회의 상태에 따른 클래스 추가
            if (meeting.transcript && (meeting.transcript.status === 'pending' || meeting.transcript.status === 'processing')) {
                meetingItem.classList.add('processing');
            } else if (meeting.transcript && meeting.transcript.status === 'error') {
                meetingItem.classList.add('error');
            } else if (meeting.summary && (meeting.summary.status === 'pending' || meeting.summary.status === 'processing')) {
                meetingItem.classList.add('processing');
            } else if (meeting.summary && meeting.summary.status === 'error') {
                meetingItem.classList.add('error');
            }
            
            // 진행 상태 뱃지 표시
            let statusBadge = '';
            
            if (meeting.transcript && (meeting.transcript.status === 'pending' || meeting.transcript.status === 'processing')) {
                statusBadge = '<div class="processing-badge">트랜스크립션 처리중</div>';
            } else if (meeting.transcript && meeting.transcript.status === 'error') {
                statusBadge = '<div class="error-badge">트랜스크립션 오류</div>';
            } else if (meeting.summary && (meeting.summary.status === 'pending' || meeting.summary.status === 'processing')) {
                statusBadge = '<div class="processing-badge">요약 처리중</div>';
            } else if (meeting.summary && meeting.summary.status === 'error') {
                statusBadge = '<div class="error-badge">요약 오류</div>';
            }
            
            meetingItem.innerHTML = `
                <div style="font-weight: bold;">${meeting.title}</div>
                <div style="font-size: 0.8em; color: #e9d5ff;">${meeting.date}</div>
                ${statusBadge}
            `;
            
            meetingItem.addEventListener('click', () => this.handleMeetingClick(meeting));
            
            content.appendChild(meetingItem);
            
            // 여기서는 폴링을 시작하지 않음 - initializeMeetings에서 처리
        });

        header.addEventListener('click', () => {
            content.classList.toggle('show');   
            header.querySelector('i').classList.toggle('fa-chevron-up');
            header.querySelector('i').classList.toggle('fa-chevron-down');
        });

        section.appendChild(header);
        section.appendChild(content);
        this.meetingList.appendChild(section);
    }

    renderMeetings() {
        const categorized = this.categorizeMeetings(this.meetings);
        this.meetingList.innerHTML = '';

        if (categorized.today.length > 0) {
            this.createTimeSection('오늘', categorized.today);
        }

        if (categorized.yesterday.length > 0) {
            this.createTimeSection('어제', categorized.yesterday);
        }

        if (categorized.lastWeek.length > 0) {
            this.createTimeSection('지난 7일', categorized.lastWeek);
        }

        if (categorized.lastMonth.length > 0) {
            this.createTimeSection('지난 30일', categorized.lastMonth);
        }

        if (categorized.last3Months.length > 0) {
            this.createTimeSection('지난 3개월', categorized.last3Months);
        }

        if (categorized.old.length > 0) {
            this.createTimeSection('오래전', categorized.old);
        }
    }

    initializeMeetings() {
        // API에서 회의 목록 가져오기
        fetch('/api/meetings')
            .then(response => response.json())
            .then(data => {
                this.meetings = data.map(meeting => ({
                    id: meeting._id,
                    _id: meeting._id,
                    title: meeting.title,
                    date: meeting.date ? new Date(meeting.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    audioFile: meeting.audioFile || {
                        status: 'uploading',
                        error: null
                    },
                    transcript: meeting.transcript || {
                        status: 'pending',
                        content: null,
                        error: null
                    },
                    summary: meeting.summary || {
                        status: 'not_started',
                        ko: null,
                        en: null,
                        zh: null,
                        error: null
                    },
                    speakerNames: meeting.speakerNames || {},
                    summaryStrategy: meeting.summaryStrategy || 'content'
                }));
                this.renderMeetings();
                
                // 이전에 실행 중이던 모든 폴링 중지
                this.stopAllPolling();
                
                // 처리 중인 회의가 있는지 확인하고 폴링 시작
                this.meetings.forEach(meeting => {
                    const transcriptProcessing = meeting.transcript && 
                                                (meeting.transcript.status === 'processing' || 
                                                 meeting.transcript.status === 'pending');
                                                 
                    const summaryProcessing = meeting.summary && 
                                             (meeting.summary.status === 'processing' || 
                                              meeting.summary.status === 'pending');
                    
                    if (transcriptProcessing || summaryProcessing) {
                        this.startPolling(meeting.id);
                    }
                });
            })
            .catch(error => {
                console.error('회의 목록 가져오기 오류:', error);
                // 오류 발생 시 더미 데이터 사용 (개발 중에만)
                this.renderMeetings();
            });
    }

    // 회의 목록 새로고침
    refreshMeetings() {
        this.initializeMeetings();
    }

    handleMeetingClick(meeting) {
        // 이벤트 발생
        const event = new CustomEvent('meetingSelected', { detail: meeting });
        document.dispatchEvent(event);
    }
    
    // 특정 회의 폴링 시작
    startPolling(meetingId) {
        if (this.pollingIntervals[meetingId]) {
            return;
        }

        const pollingManager = new PollingManager(
            (meeting) => {
                // 상태 업데이트 처리
                const meetingIndex = this.meetings.findIndex(m => m.id === meetingId);
                if (meetingIndex !== -1) {
                    this.meetings[meetingIndex] = {
                        ...this.meetings[meetingIndex],
                        transcript: meeting.transcript,
                        summary: meeting.summary
                    };
                    this.renderMeetings();
                }
            },
            this.summaryManager
        );

        pollingManager.startPolling(meetingId);
        this.pollingIntervals[meetingId] = pollingManager;
    }
    
    // 특정 회의 폴링 중지
    stopPolling(meetingId) {
        if (this.pollingIntervals[meetingId]) {
            console.log(`폴링 중지: ${meetingId}`);
            this.pollingIntervals[meetingId].stopPolling();
            delete this.pollingIntervals[meetingId];
        }
    }
    
    // 모든 폴링 중지
    stopAllPolling() {
        Object.keys(this.pollingIntervals).forEach(meetingId => {
            this.stopPolling(meetingId);
        });
        console.log('모든 폴링 중지됨');
    }
} 
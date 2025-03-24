export class MeetingsManager {
    constructor() {
        this.meetingList = document.querySelector('.meeting-list');
        this.meetings = []; // 빈 배열로 초기화

        this.initializeMeetings();
        
        // 파일 업로드 완료 이벤트 리스너 추가
        document.addEventListener('meetingStatusUpdated', () => {
            this.refreshMeetings();
        });
        
        // 새 회의 업로드 완료 이벤트 리스너 추가
        document.addEventListener('meetingUploaded', () => {
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
            <i class="fas fa-chevron-${title === '오늘' || title === '어제' ? 'up' : 'down'}"></i>
        `;

        const content = document.createElement('div');
        content.className = 'time-section-content';
        
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
            
            meetingItem.addEventListener('click', () => this.onMeetingClick(meeting));
            
            content.appendChild(meetingItem);
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
                    date: new Date(meeting.createdAt).toISOString().split('T')[0],
                    title: meeting.title,
                    status: meeting.status,
                    transcript: meeting.transcript,
                    summary: meeting.summary
                }));
                this.renderMeetings();
            })
            .catch(error => {
                console.error('회의 목록 가져오기 오류:', error);
                // 오류 발생 시 더미 데이터 사용 (개발 중에만)
                this.meetings = [
                    { date: '2024-03-22', title: '프로젝트 킥오프 미팅' },
                    { date: '2024-03-21', title: '주간 회의' },
                    { date: '2024-03-20', title: '팀 미팅' },
                    { date: '2024-03-15', title: '월간 리뷰' },
                    // ... 나머지 더미 데이터
                ];
                this.renderMeetings();
            });
    }

    // 회의 목록 새로고침
    refreshMeetings() {
        this.initializeMeetings();
    }

    onMeetingClick(meeting) {
        // 이벤트 발생
        const event = new CustomEvent('meetingSelected', { detail: meeting });
        document.dispatchEvent(event);
    }
} 
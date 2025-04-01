import { ChatManager } from './modules/chat.js';
import { FileUploadManager } from './modules/fileUpload.js';
import { MeetingsManager } from './modules/meetings.js';
import { TabsManager } from './modules/tabs.js';
import { SummaryManager } from './modules/SummaryManager.js';

document.addEventListener('DOMContentLoaded', () => {
    // 각 모듈 초기화
    const chatManager = new ChatManager();
    const tabsManager = new TabsManager();
    const summaryManager = new SummaryManager();
    const fileUploadManager = new FileUploadManager(tabsManager);
    const meetingsManager = new MeetingsManager(summaryManager);

    // 회의 선택 이벤트 리스너 추가
    document.addEventListener('meetingSelected', (e) => {
        const meetingId = e.detail._id || e.detail.id;
        chatManager.setCurrentMeetingId(meetingId);
    });

    // 회의 기록 헤더 클릭 이벤트 처리
    document.querySelector('.sidebar-header h2').addEventListener('click', () => {
        tabsManager.closeTab();
        chatManager.setCurrentMeetingId(null); // 회의 선택 해제 시 채팅 ID도 초기화
    });
});
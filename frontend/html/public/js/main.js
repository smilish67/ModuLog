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

    // 회의 기록 헤더 클릭 이벤트 처리
    document.querySelector('.sidebar-header h2').addEventListener('click', () => {
        tabsManager.closeTab();
    });
});
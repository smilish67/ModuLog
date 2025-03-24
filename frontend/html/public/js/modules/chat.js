export class ChatManager {
    constructor() {
        this.chatButton = document.getElementById('chatButton');
        this.chatContainer = document.getElementById('chatContainer');
        this.closeChat = document.getElementById('closeChat');
        this.chatInput = this.chatContainer.querySelector('input');
        this.chatSendButton = this.chatContainer.querySelector('#chatSendButton');
        this.chatMessages = this.chatContainer.querySelector('.chat-messages');
        this.suggestedMessages = this.chatContainer.querySelector('.suggested-messages');
        this.isChatOpen = false;

        this.suggestedPhrases = [
            "주요 논의 사항 알려줘",
            "PDF로 정리해줘",
            "보고서 작성해줘",
        ];

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.chatButton.addEventListener('click', () => this.toggleChat());
        this.closeChat.addEventListener('click', () => this.closeChatWindow());
        this.chatSendButton.addEventListener('click', () => this.sendMessage(this.chatInput.value));
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage(this.chatInput.value);
            }
        });
    }

    renderSuggestedMessages() {
        this.suggestedMessages.innerHTML = '';
        this.suggestedPhrases.forEach(phrase => {
            const messageEl = document.createElement('div');
            messageEl.className = 'suggested-message';
            messageEl.textContent = phrase;
            messageEl.addEventListener('click', () => {
                this.chatInput.value = phrase;
                this.chatInput.focus();
            });
            this.suggestedMessages.appendChild(messageEl);
        });
    }

    sendMessage(message) {
        if (!message.trim()) return;
        console.log(message);

        const messageEl = document.createElement('div');
        messageEl.className = 'message sent';
        messageEl.innerHTML = `
            <div class="message-content">${message}</div>
            <div class="message-time">${new Date().toLocaleTimeString()}</div>
        `;
        this.chatMessages.appendChild(messageEl);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

        this.chatInput.value = '';

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
            this.chatMessages.appendChild(responseEl);
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }, 1000);
    }

    toggleChat() {
        this.isChatOpen = !this.isChatOpen;
        this.chatButton.classList.toggle('active');
        this.chatContainer.classList.toggle('show');
        if (this.isChatOpen) {
            this.renderSuggestedMessages();
            this.chatInput.focus();
        }
    }

    closeChatWindow() {
        this.isChatOpen = false;
        this.chatButton.classList.remove('active');
        this.chatContainer.classList.remove('show');
    }
} 
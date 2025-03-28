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
        this.currentMeetingId = null;

        // this.suggestedPhrases = [
        //     "주요 논의 사항 알려줘",
        //     "PDF로 정리해줘",
        //     "보고서 작성해줘",
        // ];

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

    async sendMessage(message) {
        if (!message.trim()) return;
        if (!this.currentMeetingId) {
            console.error('현재 회의 ID가 설정되지 않았습니다.');
            return;
        }

        const messageEl = document.createElement('div');
        messageEl.className = 'message sent';
        messageEl.innerHTML = `
            <div class="message-content">${message}</div>
            <div class="message-time">${new Date().toLocaleTimeString()}</div>
        `;
        this.chatMessages.appendChild(messageEl);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

        this.chatInput.value = '';

        try {
            const response = await fetch('/api/chat/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    meetingId: this.currentMeetingId,
                    message: message
                })
            });

            const data = await response.json();

            if (data.success) {
                const responseEl = document.createElement('div');
                responseEl.className = 'message received';
                responseEl.innerHTML = `
                    <div class="message-content">${data.response}</div>
                    <div class="message-time">${new Date().toLocaleTimeString()}</div>
                `;
                this.chatMessages.appendChild(responseEl);
                this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
            } else {
                throw new Error(data.error || '응답 처리 중 오류가 발생했습니다.');
            }
        } catch (error) {
            console.error('메시지 전송 중 오류:', error);
            const errorEl = document.createElement('div');
            errorEl.className = 'message received error';
            errorEl.innerHTML = `
                <div class="message-content">죄송합니다. 메시지 전송 중 오류가 발생했습니다.</div>
                <div class="message-time">${new Date().toLocaleTimeString()}</div>
            `;
            this.chatMessages.appendChild(errorEl);
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
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

    setCurrentMeetingId(meetingId) {
        console.log('ChatManager: 현재 회의 ID 설정됨:', meetingId);
        this.currentMeetingId = meetingId;
    }
} 
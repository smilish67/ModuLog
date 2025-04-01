export class ModalManager {
    constructor() {
        this.activeModal = null;
    }

    showDeleteConfirmation(meetingId, onConfirm) {
        const modal = document.createElement('div');
        modal.className = 'modal delete-modal delete-confirmation-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>회의 삭제</h2>
                    <button class="close-modal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p>정말로 이 회의를 삭제하시겠습니까?</p>
                    <p>이 작업은 되돌릴 수 없습니다.</p>
                </div>
                <div class="modal-footer">
                    <button class="cancel-btn">취소</button>
                    <button class="confirm-delete-btn">삭제</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10);
        
        const closeButton = modal.querySelector('.close-modal');
        closeButton.addEventListener('click', () => this.closeModal(modal));
        
        const cancelButton = modal.querySelector('.cancel-btn');
        cancelButton.addEventListener('click', () => this.closeModal(modal));
        
        const confirmButton = modal.querySelector('.confirm-delete-btn');
        confirmButton.addEventListener('click', () => {
            onConfirm();
            this.closeModal(modal);
        });

        this.activeModal = modal;
    }
    
    closeModal(modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
            if (this.activeModal === modal) {
                this.activeModal = null;
            }
        }, 300);
    }

    showLoadingOverlay(message = '처리 중...') {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.id = 'global-loading-overlay';
        overlay.innerHTML = `
            <div class="loading-spinner"></div>
            <p>${message}</p>
        `;
        document.body.appendChild(overlay);
        this.activeModal = overlay;
    }
    
    hideLoadingOverlay() {
        const overlay = document.getElementById('global-loading-overlay');
        if (overlay) {
            overlay.remove();
            this.activeModal = null;
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="close-notification">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 10);
        
        const autoCloseTimeout = setTimeout(() => {
            this.closeNotification(notification);
        }, 5000);
        
        const closeButton = notification.querySelector('.close-notification');
        closeButton.addEventListener('click', () => {
            clearTimeout(autoCloseTimeout);
            this.closeNotification(notification);
        });

        this.activeModal = notification;
    }
    
    closeNotification(notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
            if (this.activeModal === notification) {
                this.activeModal = null;
            }
        }, 300);
    }
} 
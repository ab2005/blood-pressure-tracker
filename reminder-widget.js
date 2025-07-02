/**
 * Medication Reminder Widget
 * Integrates with ElevenLabs client tools data
 */

class MedicationReminderWidget {
    constructor() {
        this.reminders = [];
        this.checkInterval = null;
        this.notificationPermission = false;
        this.init();
    }

    async init() {
        this.loadReminders();
        this.requestNotificationPermission();
        this.startChecking();
        this.createWidget();
    }

    // Load reminders from localStorage
    loadReminders() {
        try {
            const stored = localStorage.getItem('medicationReminders');
            this.reminders = stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading reminders:', error);
            this.reminders = [];
        }
    }

    // Request browser notification permission
    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            this.notificationPermission = permission === 'granted';
        }
    }

    // Start checking for due reminders
    startChecking() {
        this.checkInterval = setInterval(() => {
            this.checkDueReminders();
        }, 30000); // Check every 30 seconds
    }

    // Check for due reminders
    checkDueReminders() {
        const now = new Date();
        
        this.reminders.forEach(reminder => {
            if (this.isReminderDue(reminder, now)) {
                this.showReminderNotification(reminder);
            }
        });
    }

    // Check if reminder is due
    isReminderDue(reminder, now) {
        const [hours, minutes] = reminder.time.split(':').map(Number);
        const reminderTime = new Date();
        reminderTime.setHours(hours, minutes, 0, 0);
        
        // Check if it's within 5 minutes of reminder time
        const timeDiff = Math.abs(now - reminderTime);
        const fiveMinutes = 5 * 60 * 1000;
        
        return timeDiff <= fiveMinutes && !this.wasRecentlyNotified(reminder);
    }

    // Check if we recently notified for this reminder
    wasRecentlyNotified(reminder) {
        const lastNotified = localStorage.getItem(`lastNotified_${reminder.id}`);
        if (!lastNotified) return false;
        
        const timeSince = Date.now() - parseInt(lastNotified);
        return timeSince < 30 * 60 * 1000; // 30 minutes
    }

    // Show reminder notification
    showReminderNotification(reminder) {
        // Mark as notified
        localStorage.setItem(`lastNotified_${reminder.id}`, Date.now().toString());
        
        // Browser notification
        if (this.notificationPermission) {
            const notification = new Notification('💊 Medication Reminder', {
                body: `Time to take ${reminder.medication}${reminder.dosage ? ` (${reminder.dosage})` : ''}`,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="80">💊</text></svg>',
                tag: reminder.id,
                requireInteraction: true
            });
            
            notification.onclick = () => {
                this.showReminderModal(reminder);
                notification.close();
            };
        }
        
        // Visual notification
        this.showVisualReminder(reminder);
        
        // Audio alert
        this.playReminderSound();
    }

    // Show visual reminder
    showVisualReminder(reminder) {
        const modal = document.createElement('div');
        modal.className = 'reminder-modal';
        modal.innerHTML = `
            <div class="reminder-modal-content">
                <div class="reminder-modal-header">
                    <h3>💊 Medication Reminder</h3>
                    <button class="close-btn" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
                </div>
                <div class="reminder-modal-body">
                    <h4>${reminder.medication}</h4>
                    <p><strong>Time:</strong> ${reminder.time}</p>
                    ${reminder.dosage ? `<p><strong>Dosage:</strong> ${reminder.dosage}</p>` : ''}
                    ${reminder.notes ? `<p><strong>Notes:</strong> ${reminder.notes}</p>` : ''}
                </div>
                <div class="reminder-modal-actions">
                    <button onclick="reminderWidget.markAsTaken('${reminder.id}'); this.parentElement.parentElement.parentElement.remove();">
                        ✅ Taken
                    </button>
                    <button onclick="reminderWidget.snoozeReminder('${reminder.id}'); this.parentElement.parentElement.parentElement.remove();">
                        ⏰ Snooze 15min
                    </button>
                    <button onclick="this.parentElement.parentElement.parentElement.remove();">
                        ❌ Dismiss
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Auto-remove after 30 seconds
        setTimeout(() => {
            if (modal.parentElement) {
                modal.remove();
            }
        }, 30000);
    }

    // Play reminder sound
    playReminderSound() {
        try {
            // Create a simple beep sound
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (error) {
            console.warn('Could not play reminder sound:', error);
        }
    }

    // Mark reminder as taken
    markAsTaken(id) {
        const reminder = this.reminders.find(r => r.id === id);
        if (reminder) {
            reminder.lastTaken = new Date().toISOString();
            this.saveReminders();
            this.showToast(`✅ Marked ${reminder.medication} as taken`);
        }
    }

    // Snooze reminder
    snoozeReminder(id) {
        localStorage.removeItem(`lastNotified_${id}`);
        this.showToast('⏰ Reminder snoozed for 15 minutes');
    }

    // Save reminders
    saveReminders() {
        try {
            localStorage.setItem('medicationReminders', JSON.stringify(this.reminders));
        } catch (error) {
            console.error('Error saving reminders:', error);
        }
    }

    // Show toast notification
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'reminder-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Create floating widget
    createWidget() {
        const widget = document.createElement('div');
        widget.className = 'reminder-widget';
        widget.innerHTML = `
            <div class="reminder-widget-icon" onclick="reminderWidget.toggleWidget()">
                💊
                <span class="reminder-count" id="reminder-count">0</span>
            </div>
            <div class="reminder-widget-panel" id="reminder-panel">
                <div class="reminder-widget-header">
                    <h4>Upcoming Reminders</h4>
                    <button onclick="reminderWidget.toggleWidget()">&times;</button>
                </div>
                <div class="reminder-widget-list" id="reminder-list">
                    <!-- Reminders will be populated here -->
                </div>
            </div>
        `;
        
        document.body.appendChild(widget);
        this.updateWidget();
        
        // Update widget every minute
        setInterval(() => this.updateWidget(), 60000);
    }

    // Toggle widget panel
    toggleWidget() {
        const panel = document.getElementById('reminder-panel');
        panel.classList.toggle('show');
        if (panel.classList.contains('show')) {
            this.updateWidget();
        }
    }

    // Update widget display
    updateWidget() {
        const countElement = document.getElementById('reminder-count');
        const listElement = document.getElementById('reminder-list');
        
        if (!countElement || !listElement) return;
        
        this.loadReminders(); // Refresh data
        
        const now = new Date();
        const upcomingReminders = this.reminders.filter(reminder => {
            const [hours, minutes] = reminder.time.split(':').map(Number);
            const reminderTime = new Date();
            reminderTime.setHours(hours, minutes, 0, 0);
            
            // Show reminders for next 4 hours
            const timeDiff = reminderTime - now;
            return timeDiff > 0 && timeDiff < 4 * 60 * 60 * 1000;
        });
        
        countElement.textContent = upcomingReminders.length;
        countElement.style.display = upcomingReminders.length > 0 ? 'block' : 'none';
        
        if (upcomingReminders.length === 0) {
            listElement.innerHTML = '<p>No upcoming reminders</p>';
            return;
        }
        
        listElement.innerHTML = upcomingReminders.map(reminder => {
            const [hours, minutes] = reminder.time.split(':').map(Number);
            const reminderTime = new Date();
            reminderTime.setHours(hours, minutes, 0, 0);
            const timeUntil = this.getTimeUntil(reminderTime);
            
            return `
                <div class="reminder-item">
                    <div class="reminder-name">${reminder.medication}</div>
                    <div class="reminder-time-until">${timeUntil}</div>
                    <div class="reminder-details">${reminder.time}${reminder.dosage ? ` • ${reminder.dosage}` : ''}</div>
                </div>
            `;
        }).join('');
    }

    // Get time until reminder
    getTimeUntil(reminderTime) {
        const now = new Date();
        const diff = reminderTime - now;
        
        if (diff < 0) return 'Due now';
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return `in ${hours}h ${minutes}m`;
        } else {
            return `in ${minutes}m`;
        }
    }

    // Cleanup
    destroy() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        
        const widget = document.querySelector('.reminder-widget');
        if (widget) {
            widget.remove();
        }
    }
}

// CSS Styles
const reminderStyles = `
<style>
.reminder-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.3s ease;
}

.reminder-modal-content {
    background: white;
    border-radius: 15px;
    padding: 0;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease;
}

.reminder-modal-header {
    background: linear-gradient(135deg, #4CAF50, #45a049);
    color: white;
    padding: 20px;
    border-radius: 15px 15px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.reminder-modal-header h3 {
    margin: 0;
    font-size: 1.3rem;
}

.close-btn {
    background: none;
    border: none;
    color: white;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.close-btn:hover {
    background: rgba(255,255,255,0.2);
}

.reminder-modal-body {
    padding: 20px;
}

.reminder-modal-body h4 {
    margin: 0 0 15px 0;
    font-size: 1.5rem;
    color: #333;
}

.reminder-modal-body p {
    margin: 5px 0;
    color: #666;
}

.reminder-modal-actions {
    padding: 0 20px 20px 20px;
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.reminder-modal-actions button {
    flex: 1;
    min-width: 100px;
    padding: 12px 15px;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
}

.reminder-modal-actions button:first-child {
    background: #4CAF50;
    color: white;
}

.reminder-modal-actions button:nth-child(2) {
    background: #ff9800;
    color: white;
}

.reminder-modal-actions button:last-child {
    background: #f44336;
    color: white;
}

.reminder-modal-actions button:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
}

.reminder-widget {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
}

.reminder-widget-icon {
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, #4CAF50, #45a049);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    cursor: pointer;
    box-shadow: 0 5px 20px rgba(76, 175, 80, 0.3);
    transition: all 0.3s;
    position: relative;
}

.reminder-widget-icon:hover {
    transform: scale(1.1);
    box-shadow: 0 8px 25px rgba(76, 175, 80, 0.4);
}

.reminder-count {
    position: absolute;
    top: -5px;
    right: -5px;
    background: #f44336;
    color: white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    font-size: 12px;
    font-weight: bold;
    display: none;
    align-items: center;
    justify-content: center;
}

.reminder-widget-panel {
    position: absolute;
    bottom: 70px;
    right: 0;
    width: 300px;
    background: white;
    border-radius: 15px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    transform: translateY(20px) scale(0.9);
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s;
    max-height: 400px;
    overflow: hidden;
}

.reminder-widget-panel.show {
    transform: translateY(0) scale(1);
    opacity: 1;
    visibility: visible;
}

.reminder-widget-header {
    background: linear-gradient(135deg, #4CAF50, #45a049);
    color: white;
    padding: 15px 20px;
    border-radius: 15px 15px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.reminder-widget-header h4 {
    margin: 0;
    font-size: 1.1rem;
}

.reminder-widget-header button {
    background: none;
    border: none;
    color: white;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0;
    width: 25px;
    height: 25px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.reminder-widget-list {
    max-height: 300px;
    overflow-y: auto;
    padding: 10px;
}

.reminder-item {
    padding: 12px;
    border-bottom: 1px solid #eee;
    transition: background 0.3s;
}

.reminder-item:hover {
    background: #f8f9fa;
}

.reminder-item:last-child {
    border-bottom: none;
}

.reminder-name {
    font-weight: 600;
    color: #333;
    margin-bottom: 4px;
}

.reminder-time-until {
    font-size: 0.9rem;
    color: #4CAF50;
    font-weight: 600;
}

.reminder-details {
    font-size: 0.8rem;
    color: #666;
    margin-top: 4px;
}

.reminder-toast {
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    z-index: 10001;
    transform: translateX(400px);
    transition: transform 0.3s;
    font-weight: 600;
}

.reminder-toast.show {
    transform: translateX(0);
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideIn {
    from { transform: scale(0.9) translateY(20px); }
    to { transform: scale(1) translateY(0); }
}

@media (max-width: 768px) {
    .reminder-widget-panel {
        width: 280px;
        right: -10px;
    }
    
    .reminder-modal-content {
        margin: 20px;
    }
    
    .reminder-modal-actions {
        flex-direction: column;
    }
}
</style>
`;

// Inject styles
document.head.insertAdjacentHTML('beforeend', reminderStyles);

// Initialize widget when DOM is ready
let reminderWidget;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        reminderWidget = new MedicationReminderWidget();
    });
} else {
    reminderWidget = new MedicationReminderWidget();
}
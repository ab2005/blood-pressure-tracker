/**
 * Notification Manager - Multi-method notification engine
 * Handles reliable notifications via multiple channels for maximum delivery
 * Supports system notifications, vibration, audio, and visual alerts
 */

class NotificationManager {
    constructor() {
        this.permissions = {
            notifications: false,
            vibration: false
        };
        
        this.settings = {
            defaultSound: 'notification.mp3',
            vibrationPattern: [200, 100, 200],
            notificationIcon: '/icons/health-notification.png',
            badgeIcon: '/icons/badge.png'
        };
        
        this.activeNotifications = new Map();
        this.notificationQueue = [];
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Initialize notification manager
     */
    async init() {
        try {
            await this.checkPermissions();
            await this.loadSettings();
            this.setupServiceWorkerConnection();
            this.isInitialized = true;
            console.log('🔔 NotificationManager initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize NotificationManager:', error);
        }
    }

    /**
     * Check and request permissions for notifications
     */
    async checkPermissions() {
        // Check notification permission
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                this.permissions.notifications = permission === 'granted';
            } else {
                this.permissions.notifications = Notification.permission === 'granted';
            }
        }

        // Check vibration support
        this.permissions.vibration = 'vibrate' in navigator;

        console.log('🔐 Notification permissions:', this.permissions);
        return this.permissions;
    }

    /**
     * Load notification settings from storage
     */
    async loadSettings() {
        try {
            const stored = localStorage.getItem('notificationSettings');
            if (stored) {
                const settings = JSON.parse(stored);
                this.settings = { ...this.settings, ...settings };
            }
        } catch (error) {
            console.error('Failed to load notification settings:', error);
        }
    }

    /**
     * Save notification settings to storage
     */
    async saveSettings() {
        try {
            localStorage.setItem('notificationSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save notification settings:', error);
        }
    }

    /**
     * Setup service worker connection for background notifications
     */
    setupServiceWorkerConnection() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data.type === 'NOTIFICATION_CLICKED') {
                    this.handleNotificationClick(event.data.notificationId);
                } else if (event.data.type === 'NOTIFICATION_CLOSED') {
                    this.handleNotificationClosed(event.data.notificationId);
                }
            });
        }
    }

    /**
     * Show notification using multiple methods for reliability
     */
    async showNotification(event, options = {}) {
        const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const notificationData = {
            id: notificationId,
            event: event,
            timestamp: new Date().toISOString(),
            methods: options.methods || event.notifications?.methods || ['system'],
            priority: options.priority || event.notifications?.priority || 'normal',
            title: options.title || event.title,
            body: options.body || event.description || `${event.title} is due`,
            icon: options.icon || this.settings.notificationIcon,
            badge: options.badge || this.settings.badgeIcon,
            tag: options.tag || `event_${event.id}`,
            requireInteraction: options.requireInteraction || event.notifications?.priority === 'high',
            vibrate: options.vibrate || this.settings.vibrationPattern,
            sound: options.sound || event.notifications?.sound || this.settings.defaultSound,
            actions: options.actions || this.getDefaultActions(event)
        };

        try {
            // Track active notification
            this.activeNotifications.set(notificationId, notificationData);

            // Try multiple notification methods
            const results = await Promise.allSettled([
                this.showSystemNotification(notificationData),
                this.showVibrationAlert(notificationData),
                this.showAudioAlert(notificationData),
                this.showVisualAlert(notificationData)
            ]);

            // Check if at least one method succeeded
            const successful = results.some(result => result.status === 'fulfilled');
            
            if (!successful) {
                console.warn('⚠️ All notification methods failed, using fallback');
                await this.showFallbackNotification(notificationData);
            }

            console.log('🔔 Notification sent:', notificationData.title);
            return notificationId;

        } catch (error) {
            console.error('❌ Failed to show notification:', error);
            // Remove from active notifications if failed
            this.activeNotifications.delete(notificationId);
            throw error;
        }
    }

    /**
     * Show system notification
     */
    async showSystemNotification(notificationData) {
        if (!this.permissions.notifications) {
            throw new Error('System notifications not permitted');
        }

        // Check if we have service worker for background notifications
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            
            return registration.showNotification(notificationData.title, {
                body: notificationData.body,
                icon: notificationData.icon,
                badge: notificationData.badge,
                tag: notificationData.tag,
                requireInteraction: notificationData.requireInteraction,
                vibrate: this.permissions.vibration ? notificationData.vibrate : undefined,
                actions: notificationData.actions,
                data: {
                    notificationId: notificationData.id,
                    eventId: notificationData.event.id,
                    timestamp: notificationData.timestamp
                }
            });
        } else {
            // Fallback to basic notification
            const notification = new Notification(notificationData.title, {
                body: notificationData.body,
                icon: notificationData.icon,
                tag: notificationData.tag,
                requireInteraction: notificationData.requireInteraction
            });

            notification.onclick = () => {
                this.handleNotificationClick(notificationData.id);
                notification.close();
            };

            return notification;
        }
    }

    /**
     * Show vibration alert
     */
    async showVibrationAlert(notificationData) {
        if (!this.permissions.vibration || !notificationData.methods.includes('vibration')) {
            throw new Error('Vibration not supported or not requested');
        }

        // Different vibration patterns based on priority
        let pattern = notificationData.vibrate;
        
        if (notificationData.priority === 'high') {
            pattern = [500, 200, 500, 200, 500]; // More intense for high priority
        } else if (notificationData.priority === 'low') {
            pattern = [100, 100, 100]; // Gentle for low priority
        }

        return navigator.vibrate(pattern);
    }

    /**
     * Show audio alert
     */
    async showAudioAlert(notificationData) {
        if (!notificationData.methods.includes('sound')) {
            throw new Error('Audio alert not requested');
        }

        try {
            // Try to play notification sound
            const audio = new Audio(notificationData.sound);
            audio.volume = 0.7;
            
            // Adjust volume based on priority
            if (notificationData.priority === 'high') {
                audio.volume = 1.0;
            } else if (notificationData.priority === 'low') {
                audio.volume = 0.3;
            }

            return audio.play();
        } catch (error) {
            // Fallback to system beep using Web Audio API
            return this.playSystemBeep(notificationData.priority);
        }
    }

    /**
     * Play system beep using Web Audio API
     */
    async playSystemBeep(priority = 'normal') {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Different frequencies for different priorities
            const frequency = priority === 'high' ? 800 : priority === 'low' ? 400 : 600;
            const duration = priority === 'high' ? 0.8 : 0.4;

            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);

            return Promise.resolve();
        } catch (error) {
            console.warn('Could not play system beep:', error);
            return Promise.reject(error);
        }
    }

    /**
     * Show visual alert (in-app notification)
     */
    async showVisualAlert(notificationData) {
        if (!notificationData.methods.includes('visual')) {
            throw new Error('Visual alert not requested');
        }

        // Create in-app notification overlay
        const overlay = document.createElement('div');
        overlay.className = 'notification-overlay';
        overlay.innerHTML = `
            <div class="notification-modal priority-${notificationData.priority}">
                <div class="notification-header">
                    <h3>${notificationData.title}</h3>
                    <button class="close-btn" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</button>
                </div>
                <div class="notification-body">
                    <p>${notificationData.body}</p>
                    <div class="notification-time">${new Date().toLocaleTimeString()}</div>
                </div>
                <div class="notification-actions">
                    ${notificationData.actions.map(action => 
                        `<button onclick="window.notificationManager.handleNotificationAction('${notificationData.id}', '${action.action}')">${action.title}</button>`
                    ).join('')}
                </div>
            </div>
        `;

        // Add CSS if not already present
        if (!document.querySelector('#notification-styles')) {
            this.addNotificationStyles();
        }

        document.body.appendChild(overlay);

        // Auto-remove after timeout unless high priority
        if (notificationData.priority !== 'high') {
            setTimeout(() => {
                if (overlay.parentElement) {
                    overlay.remove();
                }
            }, 10000);
        }

        return Promise.resolve();
    }

    /**
     * Show fallback notification when all other methods fail
     */
    async showFallbackNotification(notificationData) {
        // Use browser alert as last resort
        const message = `${notificationData.title}\n\n${notificationData.body}\n\nTime: ${new Date().toLocaleTimeString()}`;
        alert(message);
        return Promise.resolve();
    }

    /**
     * Get default actions for notification
     */
    getDefaultActions(event) {
        const actions = [
            { action: 'complete', title: '✅ Mark Complete' },
            { action: 'snooze', title: '⏰ Snooze 15min' }
        ];

        // Add category-specific actions
        if (event.category === 'medication') {
            actions.unshift({ action: 'taken', title: '💊 Taken' });
        } else if (event.category === 'blood-pressure') {
            actions.unshift({ action: 'measured', title: '📊 Measured' });
        }

        return actions;
    }

    /**
     * Handle notification click
     */
    handleNotificationClick(notificationId) {
        const notification = this.activeNotifications.get(notificationId);
        if (notification) {
            console.log('🔔 Notification clicked:', notification.title);
            
            // Open app or focus window
            if ('clients' in self) {
                self.clients.openWindow('/');
            } else if (window) {
                window.focus();
            }

            // Emit event for listeners
            this.emitEvent('notificationClicked', { notificationId, notification });
        }
    }

    /**
     * Handle notification action
     */
    async handleNotificationAction(notificationId, action) {
        const notification = this.activeNotifications.get(notificationId);
        if (!notification) return;

        console.log('🔔 Notification action:', action, 'for', notification.title);

        try {
            // Handle common actions
            switch (action) {
                case 'complete':
                case 'taken':
                case 'measured':
                    if (window.eventScheduler && notification.event.id) {
                        try {
                            await window.eventScheduler.completeEvent(notification.event.id);
                        } catch (error) {
                            // If it's a test notification, just log success
                            if (notification.event.category === 'test' || notification.event.id.includes('test')) {
                                console.log('✅ Test event marked as complete (simulated)');
                            } else {
                                throw error; // Re-throw for real events
                            }
                        }
                    } else {
                        console.log('✅ Event marked as complete (no scheduler available)');
                    }
                    break;
                    
                case 'snooze':
                    if (window.eventScheduler && notification.event.id) {
                        try {
                            await window.eventScheduler.snoozeEvent(notification.event.id, 15);
                        } catch (error) {
                            // If it's a test notification, just log success
                            if (notification.event.category === 'test' || notification.event.id.includes('test')) {
                                console.log('⏰ Test event snoozed (simulated)');
                            } else {
                                throw error; // Re-throw for real events
                            }
                        }
                    } else {
                        console.log('⏰ Event snoozed (no scheduler available)');
                    }
                    break;
                    
                case 'view':
                case 'dismiss':
                    // These actions don't need event scheduler interaction
                    console.log(`📋 Notification ${action} action completed`);
                    break;
            }

            // Remove visual notification
            const overlay = document.querySelector('.notification-overlay');
            if (overlay) {
                overlay.remove();
            }

            // Emit event for listeners
            this.emitEvent('notificationAction', { notificationId, action, notification });

        } catch (error) {
            console.error('❌ Failed to handle notification action:', error);
        } finally {
            // Clean up active notification
            this.activeNotifications.delete(notificationId);
        }
    }

    /**
     * Handle notification closed
     */
    handleNotificationClosed(notificationId) {
        const notification = this.activeNotifications.get(notificationId);
        if (notification) {
            console.log('🔔 Notification closed:', notification.title);
            this.activeNotifications.delete(notificationId);
            this.emitEvent('notificationClosed', { notificationId, notification });
        }
    }

    /**
     * Schedule notification for future delivery
     */
    async scheduleNotification(event, deliveryTime) {
        const now = new Date();
        const delivery = new Date(deliveryTime);
        const delay = delivery.getTime() - now.getTime();

        if (delay <= 0) {
            // Immediate delivery
            return await this.showNotification(event);
        }

        // Schedule for later
        const scheduleId = setTimeout(async () => {
            await this.showNotification(event);
        }, delay);

        // Store scheduled notification
        const scheduledNotification = {
            scheduleId,
            event,
            deliveryTime: delivery.toISOString(),
            scheduledAt: now.toISOString()
        };

        // Store in queue for persistence
        this.notificationQueue.push(scheduledNotification);
        this.saveNotificationQueue();

        console.log('📅 Notification scheduled for:', delivery.toLocaleString());
        return scheduleId;
    }

    /**
     * Cancel scheduled notification
     */
    cancelScheduledNotification(scheduleId) {
        clearTimeout(scheduleId);
        
        // Remove from queue
        this.notificationQueue = this.notificationQueue.filter(n => n.scheduleId !== scheduleId);
        this.saveNotificationQueue();
        
        console.log('❌ Scheduled notification cancelled');
    }

    /**
     * Save notification queue to storage
     */
    saveNotificationQueue() {
        try {
            // We can't serialize setTimeout IDs, so we'll store event info for recreation
            const serializableQueue = this.notificationQueue.map(n => ({
                event: n.event,
                deliveryTime: n.deliveryTime,
                scheduledAt: n.scheduledAt
            }));
            
            localStorage.setItem('notificationQueue', JSON.stringify(serializableQueue));
        } catch (error) {
            console.error('Failed to save notification queue:', error);
        }
    }

    /**
     * Restore scheduled notifications after page reload
     */
    async restoreScheduledNotifications() {
        try {
            const stored = localStorage.getItem('notificationQueue');
            if (!stored) return;

            const queue = JSON.parse(stored);
            const now = new Date();

            for (const item of queue) {
                const deliveryTime = new Date(item.deliveryTime);
                
                if (deliveryTime > now) {
                    // Re-schedule future notifications
                    await this.scheduleNotification(item.event, deliveryTime);
                } else {
                    // Deliver overdue notifications immediately
                    await this.showNotification(item.event);
                }
            }

            console.log(`🔄 Restored ${queue.length} scheduled notifications`);
        } catch (error) {
            console.error('Failed to restore scheduled notifications:', error);
        }
    }

    /**
     * Update notification settings
     */
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
        console.log('⚙️ Notification settings updated');
    }

    /**
     * Test notification system
     */
    async testNotifications() {
        try {
            // Create a proper test event in the event scheduler first
            if (window.eventScheduler) {
                const testEventData = {
                    title: 'Test Notification',
                    description: 'This is a test notification to verify the system is working',
                    category: 'test',
                    datetime: new Date(Date.now() + 30000).toISOString(), // 30 seconds from now
                    notifications: {
                        enabled: true,
                        methods: ['system', 'vibration', 'visual'],
                        priority: 'normal'
                    },
                    createdBy: 'test'
                };
                
                const testEvent = await window.eventScheduler.createEvent(testEventData);
                await this.showNotification(testEvent);
                console.log('🧪 Test notification sent with valid event ID:', testEvent.id);
            } else {
                // Fallback: create test notification without event scheduler
                const testEvent = {
                    id: 'test_notification_' + Date.now(),
                    title: 'Test Notification',
                    description: 'This is a test notification to verify the system is working',
                    category: 'test',
                    notifications: {
                        methods: ['system', 'vibration', 'visual'],
                        priority: 'normal'
                    }
                };

                await this.showNotification(testEvent);
                console.log('🧪 Test notification sent (no event scheduler)');
            }
        } catch (error) {
            console.error('❌ Failed to send test notification:', error);
            throw error;
        }
    }

    /**
     * Add CSS styles for visual notifications
     */
    addNotificationStyles() {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification-overlay {
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
            
            .notification-modal {
                background: white;
                border-radius: 15px;
                padding: 0;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                animation: slideIn 0.3s ease;
            }
            
            .notification-modal.priority-high {
                border: 3px solid #f44336;
            }
            
            .notification-modal.priority-low {
                border: 3px solid #2196f3;
            }
            
            .notification-header {
                background: linear-gradient(135deg, #4CAF50, #45a049);
                color: white;
                padding: 20px;
                border-radius: 15px 15px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .priority-high .notification-header {
                background: linear-gradient(135deg, #f44336, #d32f2f);
            }
            
            .notification-header h3 {
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
            
            .notification-body {
                padding: 20px;
            }
            
            .notification-body p {
                margin: 0 0 10px 0;
                font-size: 1.1rem;
                line-height: 1.4;
            }
            
            .notification-time {
                font-size: 0.9rem;
                color: #666;
            }
            
            .notification-actions {
                padding: 0 20px 20px 20px;
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            
            .notification-actions button {
                flex: 1;
                min-width: 100px;
                padding: 12px 15px;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .notification-actions button:first-child {
                background: #4CAF50;
                color: white;
            }
            
            .notification-actions button:nth-child(2) {
                background: #ff9800;
                color: white;
            }
            
            .notification-actions button:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideIn {
                from { transform: scale(0.9) translateY(20px); }
                to { transform: scale(1) translateY(0); }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Simple event emitter for notification events
     */
    emitEvent(eventType, data) {
        const event = new CustomEvent(`notification:${eventType}`, { detail: data });
        document.dispatchEvent(event);
    }

    /**
     * Get notification statistics
     */
    getStatistics() {
        return {
            permissions: this.permissions,
            activeNotifications: this.activeNotifications.size,
            queuedNotifications: this.notificationQueue.length,
            settings: this.settings
        };
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
} else if (typeof window !== 'undefined') {
    window.NotificationManager = NotificationManager;
    console.log('✅ NotificationManager loaded successfully');
}
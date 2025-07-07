/**
 * Service Worker for Background Notifications
 * Handles notification delivery when app is in background or closed
 * Ensures reliable health event notifications
 */

const CACHE_NAME = 'health-tracker-v1';
const NOTIFICATION_CACHE = 'notifications-v1';

// Files to cache for offline functionality
const urlsToCache = [
    '/',
    '/index.html',
    '/empty.html',
    '/client-tools.js',
    '/event-scheduler.js',
    '/notification-manager.js',
    '/agent-event-tools.js',
    '/reminder-widget.js',
    '/reminders.html',
    '/icons/health-notification.png',
    '/icons/badge.png'
];

/**
 * Service Worker Installation
 */
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('📦 Caching app resources');
                return cache.addAll(urlsToCache.filter(url => url.startsWith('/')));
            })
            .catch((error) => {
                console.error('Failed to cache resources:', error);
            })
    );
    
    // Skip waiting to activate immediately
    self.skipWaiting();
});

/**
 * Service Worker Activation
 */
self.addEventListener('activate', (event) => {
    console.log('✅ Service Worker activated');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== NOTIFICATION_CACHE) {
                        console.log('🗑️ Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    
    // Claim all clients immediately
    return self.clients.claim();
});

/**
 * Fetch Event Handler (for offline functionality)
 */
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version if available
                if (response) {
                    return response;
                }
                
                // Fetch from network
                return fetch(event.request).catch(() => {
                    // Return offline page if available
                    if (event.request.destination === 'document') {
                        return caches.match('/index.html');
                    }
                    // Return a proper Response for other failed requests
                    return new Response('', {
                        status: 200,
                        statusText: 'OK'
                    });
                });
            })
    );
});

/**
 * Push Event Handler - Handle push notifications from server
 */
self.addEventListener('push', (event) => {
    console.log('📨 Push notification received');
    
    let notificationData = {
        title: 'Health Reminder',
        body: 'You have a pending health event',
        icon: '/icons/health-notification.png',
        badge: '/icons/badge.png',
        tag: 'health-event',
        requireInteraction: false,
        data: {}
    };
    
    // Parse push data if available
    if (event.data) {
        try {
            const pushData = event.data.json();
            notificationData = { ...notificationData, ...pushData };
        } catch (error) {
            console.error('Failed to parse push data:', error);
            notificationData.body = event.data.text() || notificationData.body;
        }
    }
    
    event.waitUntil(
        showNotificationWithFallback(notificationData)
    );
});

/**
 * Show notification with fallback for different scenarios
 */
async function showNotificationWithFallback(notificationData) {
    try {
        // Get all clients (open tabs/windows)
        const clients = await self.clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        });
        
        // If app is open and focused, send message to app instead of showing notification
        const focusedClient = clients.find(client => client.focused);
        if (focusedClient) {
            console.log('📱 App is focused, sending in-app notification');
            focusedClient.postMessage({
                type: 'SHOW_IN_APP_NOTIFICATION',
                data: notificationData
            });
            return;
        }
        
        // Show system notification
        await self.registration.showNotification(notificationData.title, {
            body: notificationData.body,
            icon: notificationData.icon,
            badge: notificationData.badge,
            tag: notificationData.tag,
            requireInteraction: notificationData.requireInteraction,
            vibrate: notificationData.vibrate || [200, 100, 200],
            actions: notificationData.actions || [
                { action: 'complete', title: '✅ Mark Complete' },
                { action: 'snooze', title: '⏰ Snooze 15min' },
                { action: 'view', title: '👁️ View Details' }
            ],
            data: notificationData.data
        });
        
        console.log('🔔 System notification shown:', notificationData.title);
        
    } catch (error) {
        console.error('❌ Failed to show notification:', error);
    }
}

/**
 * Notification Click Handler
 */
self.addEventListener('notificationclick', (event) => {
    console.log('🔔 Notification clicked:', event.action);
    
    event.notification.close();
    
    const action = event.action;
    const data = event.notification.data || {};
    
    event.waitUntil(
        handleNotificationAction(action, data, event.notification.tag)
    );
});

/**
 * Handle notification action
 */
async function handleNotificationAction(action, data, tag) {
    try {
        // Get all clients
        const clients = await self.clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        });
        
        let targetClient = null;
        
        // Find existing client or open new one
        if (clients.length > 0) {
            targetClient = clients[0];
            await targetClient.focus();
        } else {
            targetClient = await self.clients.openWindow('/');
        }
        
        // Send action to client
        if (targetClient) {
            targetClient.postMessage({
                type: 'NOTIFICATION_ACTION',
                action: action,
                data: data,
                tag: tag
            });
        }
        
        // Handle specific actions
        switch (action) {
            case 'complete':
                console.log('✅ Event marked as complete');
                break;
                
            case 'snooze':
                console.log('⏰ Event snoozed for 15 minutes');
                // Could schedule another notification here
                break;
                
            case 'view':
            default:
                console.log('👁️ Opening app to view details');
                break;
        }
        
    } catch (error) {
        console.error('❌ Failed to handle notification action:', error);
    }
}

/**
 * Notification Close Handler
 */
self.addEventListener('notificationclose', (event) => {
    console.log('🔔 Notification closed:', event.notification.tag);
    
    // Track notification dismissal
    event.waitUntil(
        trackNotificationDismissal(event.notification.tag)
    );
});

/**
 * Track notification dismissal for analytics
 */
async function trackNotificationDismissal(tag) {
    try {
        // Store dismissal info for analytics
        const cache = await caches.open(NOTIFICATION_CACHE);
        const dismissalData = {
            tag: tag,
            dismissedAt: new Date().toISOString()
        };
        
        await cache.put(
            `/notification-dismissal/${tag}`,
            new Response(JSON.stringify(dismissalData))
        );
        
    } catch (error) {
        console.error('Failed to track notification dismissal:', error);
    }
}

/**
 * Background Sync Event Handler
 */
self.addEventListener('sync', (event) => {
    console.log('🔄 Background sync triggered:', event.tag);
    
    if (event.tag === 'sync-health-events') {
        event.waitUntil(syncHealthEvents());
    } else if (event.tag === 'sync-notification-settings') {
        event.waitUntil(syncNotificationSettings());
    }
});

/**
 * Sync health events data
 */
async function syncHealthEvents() {
    try {
        console.log('🔄 Syncing health events...');
        
        // Get clients to access data
        const clients = await self.clients.matchAll();
        
        if (clients.length > 0) {
            // Send sync request to client
            clients[0].postMessage({
                type: 'SYNC_HEALTH_EVENTS'
            });
        }
        
    } catch (error) {
        console.error('❌ Failed to sync health events:', error);
    }
}

/**
 * Sync notification settings
 */
async function syncNotificationSettings() {
    try {
        console.log('⚙️ Syncing notification settings...');
        
        // Implementation would depend on your backend API
        // This is a placeholder for future server sync functionality
        
    } catch (error) {
        console.error('❌ Failed to sync notification settings:', error);
    }
}

/**
 * Periodic Background Sync (if supported)
 */
self.addEventListener('periodicsync', (event) => {
    console.log('🔄 Periodic sync triggered:', event.tag);
    
    if (event.tag === 'check-due-events') {
        event.waitUntil(checkDueEvents());
    }
});

/**
 * Check for due events and show notifications
 */
async function checkDueEvents() {
    try {
        console.log('🔍 Checking for due events...');
        
        const clients = await self.clients.matchAll();
        
        if (clients.length > 0) {
            // Send check request to client
            clients[0].postMessage({
                type: 'CHECK_DUE_EVENTS'
            });
        } else {
            // If no clients are open, we can't access IndexedDB
            // This would require server-side event storage for full background operation
            console.log('ℹ️ No active clients, skipping event check');
        }
        
    } catch (error) {
        console.error('❌ Failed to check due events:', error);
    }
}

/**
 * Message Handler - Communication with main app
 */
self.addEventListener('message', (event) => {
    console.log('📨 Service Worker received message:', event.data.type);
    
    const { type, data } = event.data;
    
    switch (type) {
        case 'SCHEDULE_NOTIFICATION':
            handleScheduleNotification(data);
            break;
            
        case 'CANCEL_NOTIFICATION':
            handleCancelNotification(data);
            break;
            
        case 'UPDATE_CACHE':
            handleUpdateCache(data);
            break;
            
        case 'REGISTER_BACKGROUND_SYNC':
            handleRegisterBackgroundSync(data);
            break;
            
        default:
            console.log('Unknown message type:', type);
    }
});

/**
 * Handle schedule notification request
 */
async function handleScheduleNotification(data) {
    try {
        const { event, deliveryTime } = data;
        const delay = new Date(deliveryTime).getTime() - Date.now();
        
        if (delay > 0) {
            // Schedule notification
            setTimeout(async () => {
                await showNotificationWithFallback({
                    title: event.title,
                    body: event.description || `${event.title} is due`,
                    tag: `event_${event.id}`,
                    data: { eventId: event.id, category: event.category }
                });
            }, delay);
            
            console.log('📅 Notification scheduled for:', new Date(deliveryTime).toLocaleString());
        }
        
    } catch (error) {
        console.error('❌ Failed to schedule notification:', error);
    }
}

/**
 * Handle cancel notification request
 */
async function handleCancelNotification(data) {
    try {
        const { tag } = data;
        
        // Get all notifications and close matching ones
        const notifications = await self.registration.getNotifications({ tag });
        notifications.forEach(notification => notification.close());
        
        console.log('❌ Cancelled notifications with tag:', tag);
        
    } catch (error) {
        console.error('❌ Failed to cancel notification:', error);
    }
}

/**
 * Handle cache update request
 */
async function handleUpdateCache(data) {
    try {
        const { urls } = data;
        const cache = await caches.open(CACHE_NAME);
        
        if (urls && Array.isArray(urls)) {
            await cache.addAll(urls);
            console.log('📦 Cache updated with new URLs');
        }
        
    } catch (error) {
        console.error('❌ Failed to update cache:', error);
    }
}

/**
 * Handle register background sync request
 */
async function handleRegisterBackgroundSync(data) {
    try {
        const { tag } = data;
        
        if ('sync' in self.registration) {
            await self.registration.sync.register(tag);
            console.log('🔄 Background sync registered:', tag);
        } else {
            console.log('ℹ️ Background sync not supported');
        }
        
    } catch (error) {
        console.error('❌ Failed to register background sync:', error);
    }
}

/**
 * Error Handler
 */
self.addEventListener('error', (event) => {
    console.error('❌ Service Worker error:', event.error);
});

/**
 * Unhandled Promise Rejection Handler
 */
self.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Service Worker unhandled promise rejection:', event.reason);
    event.preventDefault();
});

console.log('🔧 Service Worker script loaded successfully');
/**
 * Event Scheduler - Core event management system
 * Handles creation, storage, and scheduling of health-related events
 * Supports both one-time and recurring events with complex patterns
 */

class EventScheduler {
    constructor() {
        this.db = null;
        this.dbName = 'HealthEventsDB';
        this.dbVersion = 1;
        this.storeName = 'events';
        this.listeners = new Map(); // Event listeners for real-time updates
        
        this.init();
    }

    /**
     * Initialize the event scheduler
     */
    async init() {
        try {
            await this.initDB();
            await this.cleanupExpiredEvents();
            console.log('🗓️ EventScheduler initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize EventScheduler:', error);
            // Fallback to localStorage if IndexedDB fails
            this.useFallbackStorage = true;
        }
    }

    /**
     * Initialize IndexedDB for persistent event storage
     */
    initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create events store
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const eventStore = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    
                    // Create indexes for efficient querying
                    eventStore.createIndex('datetime', 'datetime', { unique: false });
                    eventStore.createIndex('category', 'category', { unique: false });
                    eventStore.createIndex('status', 'status', { unique: false });
                    eventStore.createIndex('nextOccurrence', 'nextOccurrence', { unique: false });
                }
            };
        });
    }

    /**
     * Generate unique event ID
     */
    generateEventId() {
        return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Create a new event
     */
    async createEvent(eventData) {
        const event = {
            id: this.generateEventId(),
            title: eventData.title,
            description: eventData.description || '',
            category: eventData.category || 'general',
            datetime: new Date(eventData.datetime).toISOString(),
            recurring: eventData.recurring || null,
            notifications: {
                enabled: true,
                methods: ['system', 'vibration'],
                advanceWarning: [5], // 5 minutes before
                sound: 'default',
                priority: 'normal',
                ...eventData.notifications
            },
            status: 'pending',
            metadata: {
                createdAt: new Date().toISOString(),
                createdBy: eventData.createdBy || 'user',
                linkedHealthData: eventData.linkedHealthData || false,
                completedCount: 0,
                lastCompleted: null
            },
            nextOccurrence: eventData.datetime, // For recurring events
            ...eventData
        };

        // Calculate next occurrence for recurring events
        if (event.recurring) {
            event.nextOccurrence = this.calculateNextOccurrence(event);
        }

        try {
            await this.saveEvent(event);
            console.log('✅ Event created:', event.title);
            this.notifyListeners('eventCreated', event);
            return event;
        } catch (error) {
            console.error('❌ Failed to create event:', error);
            throw error;
        }
    }

    /**
     * Save event to database
     */
    async saveEvent(event) {
        if (this.useFallbackStorage) {
            return this.saveEventToLocalStorage(event);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(event);

            request.onsuccess = () => resolve(event);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Fallback to localStorage if IndexedDB is not available
     */
    saveEventToLocalStorage(event) {
        try {
            const events = JSON.parse(localStorage.getItem('healthEvents') || '[]');
            const existingIndex = events.findIndex(e => e.id === event.id);
            
            if (existingIndex >= 0) {
                events[existingIndex] = event;
            } else {
                events.push(event);
            }
            
            localStorage.setItem('healthEvents', JSON.stringify(events));
            return Promise.resolve(event);
        } catch (error) {
            return Promise.reject(error);
        }
    }

    /**
     * Get all events
     */
    async getAllEvents() {
        if (this.useFallbackStorage) {
            return this.getEventsFromLocalStorage();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get events from localStorage fallback
     */
    getEventsFromLocalStorage() {
        try {
            const events = JSON.parse(localStorage.getItem('healthEvents') || '[]');
            return Promise.resolve(events);
        } catch (error) {
            return Promise.resolve([]);
        }
    }

    /**
     * Get pending events (not completed or cancelled)
     */
    async getPendingEvents() {
        const events = await this.getAllEvents();
        return events.filter(event => event.status === 'pending');
    }

    /**
     * Get events due within specified minutes
     */
    async getEventsDue(withinMinutes = 60) {
        const events = await this.getPendingEvents();
        const now = new Date();
        const cutoff = new Date(now.getTime() + (withinMinutes * 60 * 1000));

        return events.filter(event => {
            const eventTime = new Date(event.nextOccurrence || event.datetime);
            return eventTime <= cutoff && eventTime >= now;
        });
    }

    /**
     * Update an existing event
     */
    async updateEvent(eventId, updates) {
        try {
            const events = await this.getAllEvents();
            const eventIndex = events.findIndex(e => e.id === eventId);
            
            if (eventIndex === -1) {
                throw new Error('Event not found');
            }

            const event = { ...events[eventIndex], ...updates };
            
            // Recalculate next occurrence if recurring settings changed
            if (updates.recurring || updates.datetime) {
                event.nextOccurrence = event.recurring ? 
                    this.calculateNextOccurrence(event) : 
                    event.datetime;
            }

            await this.saveEvent(event);
            console.log('✅ Event updated:', event.title);
            this.notifyListeners('eventUpdated', event);
            return event;
        } catch (error) {
            console.error('❌ Failed to update event:', error);
            throw error;
        }
    }

    /**
     * Delete an event
     */
    async deleteEvent(eventId) {
        try {
            if (this.useFallbackStorage) {
                return this.deleteEventFromLocalStorage(eventId);
            }

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.delete(eventId);

                request.onsuccess = () => {
                    console.log('✅ Event deleted:', eventId);
                    this.notifyListeners('eventDeleted', { id: eventId });
                    resolve();
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('❌ Failed to delete event:', error);
            throw error;
        }
    }

    /**
     * Delete event from localStorage
     */
    deleteEventFromLocalStorage(eventId) {
        try {
            const events = JSON.parse(localStorage.getItem('healthEvents') || '[]');
            const filteredEvents = events.filter(e => e.id !== eventId);
            localStorage.setItem('healthEvents', JSON.stringify(filteredEvents));
            return Promise.resolve();
        } catch (error) {
            return Promise.reject(error);
        }
    }

    /**
     * Mark event as completed
     */
    async completeEvent(eventId) {
        try {
            const events = await this.getAllEvents();
            const event = events.find(e => e.id === eventId);
            
            if (!event) {
                throw new Error('Event not found');
            }

            const updates = {
                status: event.recurring ? 'pending' : 'completed',
                metadata: {
                    ...event.metadata,
                    completedCount: (event.metadata.completedCount || 0) + 1,
                    lastCompleted: new Date().toISOString()
                }
            };

            // For recurring events, calculate next occurrence
            if (event.recurring) {
                updates.nextOccurrence = this.calculateNextOccurrence(event, new Date());
            }

            return await this.updateEvent(eventId, updates);
        } catch (error) {
            console.error('❌ Failed to complete event:', error);
            throw error;
        }
    }

    /**
     * Snooze an event by specified minutes
     */
    async snoozeEvent(eventId, minutes = 15) {
        try {
            const events = await this.getAllEvents();
            const event = events.find(e => e.id === eventId);
            
            if (!event) {
                throw new Error('Event not found');
            }

            const currentTime = new Date(event.nextOccurrence || event.datetime);
            const snoozeUntil = new Date(currentTime.getTime() + (minutes * 60 * 1000));

            const updates = {
                nextOccurrence: snoozeUntil.toISOString(),
                metadata: {
                    ...event.metadata,
                    snoozedAt: new Date().toISOString(),
                    snoozeCount: (event.metadata.snoozeCount || 0) + 1
                }
            };

            return await this.updateEvent(eventId, updates);
        } catch (error) {
            console.error('❌ Failed to snooze event:', error);
            throw error;
        }
    }

    /**
     * Calculate next occurrence for recurring events
     */
    calculateNextOccurrence(event, fromDate = null) {
        if (!event.recurring) {
            return event.datetime;
        }

        const baseDate = fromDate || new Date(event.datetime);
        const recurring = event.recurring;
        let nextDate = new Date(baseDate);

        switch (recurring.type) {
            case 'daily':
                nextDate.setDate(nextDate.getDate() + (recurring.interval || 1));
                break;
                
            case 'weekly':
                nextDate.setDate(nextDate.getDate() + (7 * (recurring.interval || 1)));
                break;
                
            case 'monthly':
                nextDate.setMonth(nextDate.getMonth() + (recurring.interval || 1));
                break;
                
            case 'custom':
                if (recurring.customInterval) {
                    nextDate.setTime(nextDate.getTime() + recurring.customInterval);
                }
                break;
                
            default:
                console.warn('Unknown recurring type:', recurring.type);
                return event.datetime;
        }

        // Check if we've passed the end date
        if (recurring.endDate && nextDate > new Date(recurring.endDate)) {
            return null; // Event series has ended
        }

        return nextDate.toISOString();
    }

    /**
     * Clean up expired events
     */
    async cleanupExpiredEvents() {
        try {
            const events = await this.getAllEvents();
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

            const expiredEvents = events.filter(event => {
                // Remove completed non-recurring events older than 30 days
                if (event.status === 'completed' && !event.recurring) {
                    return new Date(event.metadata.lastCompleted || event.datetime) < thirtyDaysAgo;
                }
                
                // Remove cancelled events older than 7 days
                if (event.status === 'cancelled') {
                    return new Date(event.metadata.cancelledAt || event.datetime) < new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
                }

                return false;
            });

            for (const event of expiredEvents) {
                await this.deleteEvent(event.id);
            }

            if (expiredEvents.length > 0) {
                console.log(`🧹 Cleaned up ${expiredEvents.length} expired events`);
            }
        } catch (error) {
            console.error('❌ Failed to cleanup expired events:', error);
        }
    }

    /**
     * Search events by criteria
     */
    async searchEvents(criteria) {
        const events = await this.getAllEvents();
        
        return events.filter(event => {
            // Search by title or description
            if (criteria.query) {
                const query = criteria.query.toLowerCase();
                const title = event.title.toLowerCase();
                const description = event.description.toLowerCase();
                
                if (!title.includes(query) && !description.includes(query)) {
                    return false;
                }
            }
            
            // Filter by category
            if (criteria.category && event.category !== criteria.category) {
                return false;
            }
            
            // Filter by status
            if (criteria.status && event.status !== criteria.status) {
                return false;
            }
            
            // Filter by date range
            if (criteria.startDate || criteria.endDate) {
                const eventDate = new Date(event.nextOccurrence || event.datetime);
                
                if (criteria.startDate && eventDate < new Date(criteria.startDate)) {
                    return false;
                }
                
                if (criteria.endDate && eventDate > new Date(criteria.endDate)) {
                    return false;
                }
            }
            
            return true;
        });
    }

    /**
     * Get event statistics
     */
    async getStatistics() {
        const events = await this.getAllEvents();
        
        const stats = {
            total: events.length,
            pending: events.filter(e => e.status === 'pending').length,
            completed: events.filter(e => e.status === 'completed').length,
            cancelled: events.filter(e => e.status === 'cancelled').length,
            recurring: events.filter(e => e.recurring).length,
            categories: {}
        };

        // Count by category
        events.forEach(event => {
            stats.categories[event.category] = (stats.categories[event.category] || 0) + 1;
        });

        return stats;
    }

    /**
     * Add event listener for real-time updates
     */
    addEventListener(eventType, callback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType).push(callback);
    }

    /**
     * Remove event listener
     */
    removeEventListener(eventType, callback) {
        if (this.listeners.has(eventType)) {
            const callbacks = this.listeners.get(eventType);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Notify all listeners of an event
     */
    notifyListeners(eventType, data) {
        if (this.listeners.has(eventType)) {
            this.listeners.get(eventType).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in event listener:', error);
                }
            });
        }
    }

    /**
     * Export events data
     */
    async exportEvents() {
        const events = await this.getAllEvents();
        return {
            version: '1.0',
            exportDate: new Date().toISOString(),
            events: events
        };
    }

    /**
     * Import events data
     */
    async importEvents(data) {
        if (!data.events || !Array.isArray(data.events)) {
            throw new Error('Invalid import data format');
        }

        const imported = [];
        for (const eventData of data.events) {
            try {
                // Generate new ID to avoid conflicts
                const event = {
                    ...eventData,
                    id: this.generateEventId(),
                    metadata: {
                        ...eventData.metadata,
                        importedAt: new Date().toISOString()
                    }
                };
                
                await this.saveEvent(event);
                imported.push(event);
            } catch (error) {
                console.error('Failed to import event:', eventData.title, error);
            }
        }

        console.log(`📥 Imported ${imported.length} events`);
        return imported;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventScheduler;
} else if (typeof window !== 'undefined') {
    window.EventScheduler = EventScheduler;
    console.log('✅ EventScheduler loaded successfully');
}
/**
 * ElevenLabs Agent Event Tools
 * Voice-controlled event management tools for health scheduling
 * Integrates with EventScheduler and NotificationManager
 */

const AgentEventTools = {
    /**
     * Add a new event (one-time or recurring)
     * Voice examples: "Remind me to take blood pressure at 8 AM daily"
     *                "Set a medication reminder for aspirin at 9:30 PM"
     */
    addEvent: async ({ title, datetime, description, category, recurring, notifications }) => {
        console.log('📅 Adding event via voice:', { title, datetime, description, category, recurring });

        if (!window.eventScheduler) {
            return 'Error: Event system not available. Please refresh the page.';
        }

        try {
            // Parse datetime if it's a string
            let eventDateTime;
            if (typeof datetime === 'string') {
                eventDateTime = new Date(datetime);
                if (isNaN(eventDateTime.getTime())) {
                    // Try parsing relative times like "8 AM", "tomorrow at 2 PM"
                    eventDateTime = AgentEventTools.parseRelativeDateTime(datetime);
                }
            } else {
                eventDateTime = new Date(datetime);
            }

            if (isNaN(eventDateTime.getTime())) {
                return `Error: Could not understand the time "${datetime}". Please specify a clear date and time like "8:00 AM" or "tomorrow at 2 PM".`;
            }

            // Parse recurring pattern from natural language
            const recurringPattern = recurring ? AgentEventTools.parseRecurringPattern(recurring) : null;

            // Determine category from title/description if not specified
            const eventCategory = category || AgentEventTools.determineCategory(title, description);

            // Set default notifications based on category
            const eventNotifications = {
                enabled: true,
                methods: ['system', 'vibration'],
                advanceWarning: [5], // 5 minutes before
                priority: eventCategory === 'medication' ? 'high' : 'normal',
                ...notifications
            };

            const eventData = {
                title: title,
                datetime: eventDateTime.toISOString(),
                description: description || '',
                category: eventCategory,
                recurring: recurringPattern,
                notifications: eventNotifications,
                createdBy: 'agent'
            };

            const event = await window.eventScheduler.createEvent(eventData);
            
            // Schedule notification
            if (window.notificationManager && eventNotifications.enabled) {
                await window.notificationManager.scheduleNotification(event, eventDateTime);
            }

            let response = `✅ Event created: "${title}" scheduled for ${eventDateTime.toLocaleString()}`;
            
            if (recurringPattern) {
                response += ` (${recurringPattern.type} - ${recurringPattern.interval > 1 ? `every ${recurringPattern.interval}` : 'every'} ${recurringPattern.type})`;
            }

            if (eventNotifications.advanceWarning?.length > 0) {
                response += `. You'll be notified ${eventNotifications.advanceWarning.join(' and ')} minutes before.`;
            }

            return response;

        } catch (error) {
            console.error('❌ Failed to add event:', error);
            return `Error creating event: ${error.message}. Please try again with a different time format.`;
        }
    },

    /**
     * Remove an event by description or time
     * Voice examples: "Cancel my blood pressure reminder"
     *                "Remove the aspirin reminder for tonight"
     */
    removeEvent: async ({ eventDescription, datetime, eventId }) => {
        console.log('🗑️ Removing event via voice:', { eventDescription, datetime, eventId });

        if (!window.eventScheduler) {
            return 'Error: Event system not available. Please refresh the page.';
        }

        try {
            let eventsToRemove = [];

            if (eventId) {
                // Remove by specific ID
                eventsToRemove = [{ id: eventId }];
            } else {
                // Search for events to remove
                const searchCriteria = {};
                
                if (eventDescription) {
                    searchCriteria.query = eventDescription;
                }
                
                if (datetime) {
                    const targetDate = new Date(datetime);
                    if (!isNaN(targetDate.getTime())) {
                        searchCriteria.startDate = targetDate.toISOString();
                        searchCriteria.endDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000).toISOString();
                    }
                }

                const foundEvents = await window.eventScheduler.searchEvents(searchCriteria);
                eventsToRemove = foundEvents.filter(event => event.status === 'pending');
            }

            if (eventsToRemove.length === 0) {
                return eventDescription ? 
                    `No pending events found matching "${eventDescription}".` :
                    'No pending events found to remove.';
            }

            if (eventsToRemove.length > 1) {
                const eventList = eventsToRemove.map(e => `"${e.title}" on ${new Date(e.nextOccurrence || e.datetime).toLocaleString()}`).join(', ');
                return `Found multiple events: ${eventList}. Please be more specific about which event to remove.`;
            }

            const eventToRemove = eventsToRemove[0];
            await window.eventScheduler.deleteEvent(eventToRemove.id);

            return `✅ Removed event: "${eventToRemove.title}" scheduled for ${new Date(eventToRemove.nextOccurrence || eventToRemove.datetime).toLocaleString()}`;

        } catch (error) {
            console.error('❌ Failed to remove event:', error);
            return `Error removing event: ${error.message}`;
        }
    },

    /**
     * List all pending events
     * Voice examples: "What are my upcoming reminders?"
     *                "Show me my schedule for today"
     */
    listPendingEvents: async ({ timeframe, category, limit }) => {
        console.log('📋 Listing pending events via voice:', { timeframe, category, limit });

        if (!window.eventScheduler) {
            return 'Error: Event system not available. Please refresh the page.';
        }

        try {
            let events = await window.eventScheduler.getPendingEvents();

            // Filter by category if specified
            if (category) {
                events = events.filter(event => 
                    event.category.toLowerCase().includes(category.toLowerCase()) ||
                    event.title.toLowerCase().includes(category.toLowerCase())
                );
            }

            // Filter by timeframe
            if (timeframe) {
                const now = new Date();
                let endTime;

                switch (timeframe.toLowerCase()) {
                    case 'today':
                        endTime = new Date(now);
                        endTime.setHours(23, 59, 59, 999);
                        break;
                    case 'tomorrow':
                        const tomorrow = new Date(now);
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        endTime = new Date(tomorrow);
                        endTime.setHours(23, 59, 59, 999);
                        events = events.filter(event => {
                            const eventDate = new Date(event.nextOccurrence || event.datetime);
                            return eventDate >= tomorrow && eventDate <= endTime;
                        });
                        break;
                    case 'week':
                        endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                        break;
                    case 'month':
                        endTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                        break;
                    default:
                        // Try to parse as number of days
                        const days = parseInt(timeframe);
                        if (!isNaN(days)) {
                            endTime = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
                        }
                }

                if (endTime && timeframe.toLowerCase() !== 'tomorrow') {
                    events = events.filter(event => {
                        const eventDate = new Date(event.nextOccurrence || event.datetime);
                        return eventDate <= endTime;
                    });
                }
            }

            // Sort by datetime
            events.sort((a, b) => {
                const dateA = new Date(a.nextOccurrence || a.datetime);
                const dateB = new Date(b.nextOccurrence || b.datetime);
                return dateA - dateB;
            });

            // Apply limit
            if (limit && !isNaN(parseInt(limit))) {
                events = events.slice(0, parseInt(limit));
            }

            if (events.length === 0) {
                const timeframeText = timeframe ? ` for ${timeframe}` : '';
                const categoryText = category ? ` in ${category}` : '';
                return `No pending events found${timeframeText}${categoryText}.`;
            }

            const eventList = events.map((event, index) => {
                const eventDate = new Date(event.nextOccurrence || event.datetime);
                const timeString = eventDate.toLocaleString();
                const recurringText = event.recurring ? ` (${event.recurring.type})` : '';
                
                return `${index + 1}. ${event.title} - ${timeString}${recurringText}${event.description ? ` - ${event.description}` : ''}`;
            }).join('\n');

            const timeframeText = timeframe ? ` for ${timeframe}` : '';
            const categoryText = category ? ` (${category})` : '';
            
            return `📅 Upcoming events${timeframeText}${categoryText}:\n\n${eventList}`;

        } catch (error) {
            console.error('❌ Failed to list events:', error);
            return `Error listing events: ${error.message}`;
        }
    },

    /**
     * Update an existing event
     * Voice examples: "Change my blood pressure reminder to 9 AM"
     *                "Update the aspirin reminder time to 8:30 PM"
     */
    updateEvent: async ({ eventDescription, newDateTime, newTitle, newDescription, newRecurring }) => {
        console.log('✏️ Updating event via voice:', { eventDescription, newDateTime, newTitle, newDescription });

        if (!window.eventScheduler) {
            return 'Error: Event system not available. Please refresh the page.';
        }

        try {
            // Find the event to update
            const searchCriteria = { query: eventDescription };
            const foundEvents = await window.eventScheduler.searchEvents(searchCriteria);
            const pendingEvents = foundEvents.filter(event => event.status === 'pending');

            if (pendingEvents.length === 0) {
                return `No pending events found matching "${eventDescription}".`;
            }

            if (pendingEvents.length > 1) {
                const eventList = pendingEvents.map(e => `"${e.title}" on ${new Date(e.nextOccurrence || e.datetime).toLocaleString()}`).join(', ');
                return `Found multiple events: ${eventList}. Please be more specific about which event to update.`;
            }

            const event = pendingEvents[0];
            const updates = {};

            // Update datetime
            if (newDateTime) {
                const updatedDateTime = new Date(newDateTime);
                if (isNaN(updatedDateTime.getTime())) {
                    const parsedDateTime = AgentEventTools.parseRelativeDateTime(newDateTime);
                    if (!isNaN(parsedDateTime.getTime())) {
                        updates.datetime = parsedDateTime.toISOString();
                    } else {
                        return `Error: Could not understand the new time "${newDateTime}".`;
                    }
                } else {
                    updates.datetime = updatedDateTime.toISOString();
                }
            }

            // Update title
            if (newTitle) {
                updates.title = newTitle;
            }

            // Update description
            if (newDescription) {
                updates.description = newDescription;
            }

            // Update recurring pattern
            if (newRecurring) {
                updates.recurring = AgentEventTools.parseRecurringPattern(newRecurring);
            }

            const updatedEvent = await window.eventScheduler.updateEvent(event.id, updates);

            let response = `✅ Updated event: "${updatedEvent.title}"`;
            
            if (updates.datetime) {
                response += ` - new time: ${new Date(updates.datetime).toLocaleString()}`;
            }

            return response;

        } catch (error) {
            console.error('❌ Failed to update event:', error);
            return `Error updating event: ${error.message}`;
        }
    },

    /**
     * Configure notification settings
     * Voice examples: "Turn off vibration for medication reminders"
     *                "Set high priority for blood pressure alerts"
     */
    configureNotifications: async ({ setting, value, category }) => {
        console.log('⚙️ Configuring notifications via voice:', { setting, value, category });

        if (!window.notificationManager) {
            return 'Error: Notification system not available. Please refresh the page.';
        }

        try {
            const currentSettings = window.notificationManager.settings;
            const newSettings = { ...currentSettings };

            // Parse setting changes
            switch (setting?.toLowerCase()) {
                case 'vibration':
                    if (value?.toLowerCase() === 'off' || value?.toLowerCase() === 'disable') {
                        newSettings.vibrationEnabled = false;
                    } else if (value?.toLowerCase() === 'on' || value?.toLowerCase() === 'enable') {
                        newSettings.vibrationEnabled = true;
                    }
                    break;

                case 'sound':
                    if (value?.toLowerCase() === 'off' || value?.toLowerCase() === 'disable') {
                        newSettings.soundEnabled = false;
                    } else if (value?.toLowerCase() === 'on' || value?.toLowerCase() === 'enable') {
                        newSettings.soundEnabled = true;
                    } else if (value) {
                        newSettings.defaultSound = value;
                    }
                    break;

                case 'priority':
                    if (['high', 'normal', 'low'].includes(value?.toLowerCase())) {
                        newSettings.defaultPriority = value.toLowerCase();
                    }
                    break;

                case 'advance':
                case 'warning':
                    const minutes = parseInt(value);
                    if (!isNaN(minutes)) {
                        newSettings.defaultAdvanceWarning = [minutes];
                    }
                    break;
            }

            window.notificationManager.updateSettings(newSettings);
            
            return `✅ Notification settings updated: ${setting} set to ${value}${category ? ` for ${category}` : ''}`;

        } catch (error) {
            console.error('❌ Failed to configure notifications:', error);
            return `Error configuring notifications: ${error.message}`;
        }
    },

    /**
     * Snooze a pending event
     * Voice examples: "Snooze my blood pressure reminder for 15 minutes"
     *                "Delay the aspirin reminder by 30 minutes"
     */
    snoozeEvent: async ({ eventDescription, duration }) => {
        console.log('⏰ Snoozing event via voice:', { eventDescription, duration });

        if (!window.eventScheduler) {
            return 'Error: Event system not available. Please refresh the page.';
        }

        try {
            // Find the event to snooze
            const searchCriteria = { query: eventDescription };
            const foundEvents = await window.eventScheduler.searchEvents(searchCriteria);
            const pendingEvents = foundEvents.filter(event => event.status === 'pending');

            if (pendingEvents.length === 0) {
                return `No pending events found matching "${eventDescription}".`;
            }

            if (pendingEvents.length > 1) {
                const eventList = pendingEvents.map(e => `"${e.title}"`).join(', ');
                return `Found multiple events: ${eventList}. Please be more specific about which event to snooze.`;
            }

            // Parse duration
            let snoozeMinutes = 15; // default
            if (duration) {
                const parsed = parseInt(duration);
                if (!isNaN(parsed)) {
                    snoozeMinutes = parsed;
                } else if (duration.includes('hour')) {
                    const hours = parseInt(duration);
                    snoozeMinutes = (isNaN(hours) ? 1 : hours) * 60;
                }
            }

            const event = pendingEvents[0];
            await window.eventScheduler.snoozeEvent(event.id, snoozeMinutes);

            return `⏰ Snoozed "${event.title}" for ${snoozeMinutes} minutes. Next reminder at ${new Date(Date.now() + snoozeMinutes * 60 * 1000).toLocaleTimeString()}.`;

        } catch (error) {
            console.error('❌ Failed to snooze event:', error);
            return `Error snoozing event: ${error.message}`;
        }
    },

    /**
     * Mark an event as completed
     * Voice examples: "Mark blood pressure check as done"
     *                "I took my aspirin"
     */
    markEventComplete: async ({ eventDescription }) => {
        console.log('✅ Marking event complete via voice:', { eventDescription });

        if (!window.eventScheduler) {
            return 'Error: Event system not available. Please refresh the page.';
        }

        try {
            // Find the event to complete
            const searchCriteria = { query: eventDescription };
            const foundEvents = await window.eventScheduler.searchEvents(searchCriteria);
            const pendingEvents = foundEvents.filter(event => event.status === 'pending');

            if (pendingEvents.length === 0) {
                return `No pending events found matching "${eventDescription}".`;
            }

            if (pendingEvents.length > 1) {
                const eventList = pendingEvents.map(e => `"${e.title}"`).join(', ');
                return `Found multiple events: ${eventList}. Please be more specific about which event to mark as complete.`;
            }

            const event = pendingEvents[0];
            const completedEvent = await window.eventScheduler.completeEvent(event.id);

            let response = `✅ Marked "${event.title}" as completed.`;
            
            if (event.recurring && completedEvent.nextOccurrence) {
                const nextTime = new Date(completedEvent.nextOccurrence).toLocaleString();
                response += ` Next occurrence scheduled for ${nextTime}.`;
            }

            return response;

        } catch (error) {
            console.error('❌ Failed to mark event complete:', error);
            return `Error marking event complete: ${error.message}`;
        }
    },

    /**
     * Parse relative datetime strings
     */
    parseRelativeDateTime: (dateTimeString) => {
        const now = new Date();
        const str = dateTimeString.toLowerCase();

        // Handle "tomorrow at X"
        if (str.includes('tomorrow')) {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            // Extract time if specified
            const timeMatch = str.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/);
            if (timeMatch) {
                let hours = parseInt(timeMatch[1]);
                const minutes = parseInt(timeMatch[2]) || 0;
                const ampm = timeMatch[3];
                
                if (ampm === 'pm' && hours !== 12) hours += 12;
                if (ampm === 'am' && hours === 12) hours = 0;
                
                tomorrow.setHours(hours, minutes, 0, 0);
            }
            
            return tomorrow;
        }

        // Handle "at X AM/PM" (today)
        const timeMatch = str.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/);
        if (timeMatch) {
            const result = new Date(now);
            let hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]) || 0;
            const ampm = timeMatch[3];
            
            if (ampm === 'pm' && hours !== 12) hours += 12;
            if (ampm === 'am' && hours === 12) hours = 0;
            
            result.setHours(hours, minutes, 0, 0);
            
            // If time has passed today, schedule for tomorrow
            if (result <= now) {
                result.setDate(result.getDate() + 1);
            }
            
            return result;
        }

        // Try to parse as regular date
        return new Date(dateTimeString);
    },

    /**
     * Parse recurring pattern from natural language
     */
    parseRecurringPattern: (recurringString) => {
        const str = recurringString.toLowerCase();

        if (str.includes('daily') || str.includes('every day')) {
            return { type: 'daily', interval: 1 };
        }

        if (str.includes('weekly') || str.includes('every week')) {
            return { type: 'weekly', interval: 1 };
        }

        if (str.includes('monthly') || str.includes('every month')) {
            return { type: 'monthly', interval: 1 };
        }

        // Handle "every X days/weeks/months"
        const intervalMatch = str.match(/every (\d+) (day|week|month)s?/);
        if (intervalMatch) {
            return {
                type: intervalMatch[2] + 'ly',
                interval: parseInt(intervalMatch[1])
            };
        }

        // Default to daily
        return { type: 'daily', interval: 1 };
    },

    /**
     * Determine category from title and description
     */
    determineCategory: (title, description = '') => {
        const text = (title + ' ' + description).toLowerCase();

        if (text.includes('medication') || text.includes('medicine') || text.includes('pill') || text.includes('dose')) {
            return 'medication';
        }

        if (text.includes('blood pressure') || text.includes('bp')) {
            return 'blood-pressure';
        }

        if (text.includes('appointment') || text.includes('doctor') || text.includes('clinic')) {
            return 'appointment';
        }

        if (text.includes('exercise') || text.includes('workout') || text.includes('walk')) {
            return 'exercise';
        }

        if (text.includes('meal') || text.includes('eat') || text.includes('diet')) {
            return 'nutrition';
        }

        return 'general';
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AgentEventTools;
} else if (typeof window !== 'undefined') {
    window.AgentEventTools = AgentEventTools;
    console.log('✅ AgentEventTools loaded successfully');
    console.log('🔧 Available agent tools:', Object.keys(AgentEventTools));
}
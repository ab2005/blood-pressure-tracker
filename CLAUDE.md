# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Progressive Web App (PWA) for blood pressure tracking and medication management with voice control capabilities. The app is built with vanilla JavaScript and uses ElevenLabs Conversational AI for voice interactions.

## Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **PWA Features**: Service Worker, Web App Manifest, offline support
- **Voice Integration**: ElevenLabs Conversational AI API
- **Data Storage**: LocalStorage for client-side persistence
- **Notifications**: Web Notifications API with multiple fallback methods
- **Language**: Russian (with some English in technical documentation)

## Key Architecture Components

### Core Files

1. **index.html** - Main application entry point with blood pressure tracking UI
2. **sw-notifications.js** - Service Worker handling background notifications and offline caching
3. **notification-manager.js** - Multi-method notification engine supporting system notifications, vibration, audio, and visual alerts
4. **client-tools.js** - Client-side tools for blood pressure logging, history retrieval, and medication reminders
5. **agent-event-tools.js** - Tools for ElevenLabs AI agent integration
6. **event-scheduler.js** - Event scheduling system for medication reminders

### Architecture Patterns

1. **Service Worker Pattern**: The app uses a service worker for offline functionality and background notifications. The worker caches essential files and handles notification delivery when the app is closed.

2. **Tool-based Architecture**: Client functionality is exposed through a tools system that can be called by the ElevenLabs AI agent (defined in tools-definition.json).

3. **Multi-method Notification System**: The notification manager implements fallback methods to ensure reliable delivery across different devices and browsers, especially addressing iOS limitations.

## Development Commands

This is a static web application with no build process. Development workflow:

```bash
# Serve locally (use any static file server)
python -m http.server 8000
# or
npx serve .

# No build/compile step required - edit files directly
# No test suite configured
# No linting configuration present
```

## Testing Notifications

The app includes test interfaces:
- **empty.html** - Notification testing interface with iOS-specific tests
- **test-event-system.html** - Event system testing
- **test-widget.html** - Widget component testing

## Important Considerations

1. **Service Worker Updates**: When modifying service worker code, update the CACHE_NAME version to force re-installation
2. **iOS Compatibility**: Special handling for iOS notification limitations is implemented throughout
3. **Localization**: UI text is primarily in Russian
4. **Data Privacy**: All health data is stored locally in the browser
5. **Voice Integration**: Requires ElevenLabs API configuration for voice features

## Client Tools Available

The app exposes these tools for the AI agent:
- `logBloodPressure` - Record blood pressure readings
- `getBloodPressureHistory` - Retrieve historical data
- `analyzeBloodPressure` - Analyze readings and provide health categories
- `setMedicationReminder` - Set medication reminders
- `getCustomerDetails` - Get user account information
- Various redirect tools for support and documentation
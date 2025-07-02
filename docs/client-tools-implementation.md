# Client Tools Implementation Guide

## Overview

This document describes the client-side implementation of ElevenLabs tools for the blood pressure tracker application.

## Architecture

### File Structure
```
blood-pressure-tracker/
├── client-tools.js         # Modular client tool implementations
├── el-widget.js            # ElevenLabs widget integration
├── empty.html              # Test page with proper script loading
└── docs/
    ├── elevenlabs_account_tools.md      # Server-side tool documentation
    └── client-tools-implementation.md   # This file
```

### Script Loading Order
**Critical:** Scripts must be loaded in the correct order:
```html
<script src="client-tools.js"></script>
<script src="el-widget.js"></script>
```

## Client Tools Reference

### Health Tracking Tools

#### 1. logBloodPressure
**Purpose:** Log blood pressure readings to localStorage
**Parameters:**
- `systolic` (number, required) - Systolic pressure (70-200 mmHg)
- `diastolic` (number, required) - Diastolic pressure (40-120 mmHg)  
- `pulse` (number, optional) - Heart rate in BPM
- `time` (string, optional) - ISO timestamp
- `details` (string, optional) - Additional notes

**Returns:** Success message with logged values

#### 2. getBloodPressureHistory
**Purpose:** Retrieve recent blood pressure readings
**Parameters:**
- `days` (number, optional) - Days to look back (default: 7)

**Features:**
- Auto-generates test data if no recent readings exist
- Sorts readings by newest first
- Includes notes and pulse in output
- Comprehensive debug logging

**Returns:** Formatted history or "No readings found" message

#### 3. analyzeBloodPressure
**Purpose:** Classify blood pressure into medical categories
**Parameters:**
- `systolic` (number, required) - Systolic value
- `diastolic` (number, required) - Diastolic value

**Categories:**
- Normal: <120 and <80
- Elevated: <130 and <80  
- Stage 1 Hypertension: 130-139 or 80-89
- Stage 2 Hypertension: ≥140 or ≥90
- Hypertensive Crisis: ≥180 or ≥120

**Returns:** Classification with medical recommendations

### Medication Management

#### 4. setMedicationReminder
**Purpose:** Store medication reminders in localStorage
**Parameters:**
- `medication` (string, required) - Medication name
- `time` (string, required) - Time in HH:MM format
- `frequency` (string, optional) - How often (default: "daily")
- `notes` (string, optional) - Additional information

**Returns:** Confirmation message with reminder details

### Utility Tools

#### 5. getCurrentDateTime
**Purpose:** Get formatted current date and time
**Parameters:** None

**Format:** "Tuesday, July 2, 2025, 10:30:15 AM"
**Returns:** Human-readable date/time string

#### 6. getLocation
**Purpose:** Get user location with reverse geocoding
**Parameters:** None

**Features:**
- Uses browser geolocation API
- Reverse geocodes coordinates to city/country
- Handles permission denials gracefully
- 10-second timeout with 5-minute cache
- Uses BigDataCloud API (free, no key required)

**Returns:** 
- Success: "Location: City, Country\nCoordinates: lat, lon\nAccuracy: ±X meters"
- Error: Descriptive error message

### Navigation Tools

#### 7. redirectToDocs
**Purpose:** Navigate to documentation pages
**Parameters:**
- `path` (string, required) - Documentation path

**Implementation:** Uses Next.js router if available

#### 8. redirectToEmailSupport
**Purpose:** Open email client with pre-filled support email
**Parameters:**
- `subject` (string, required) - Email subject
- `body` (string, required) - Email body

**Implementation:** Opens mailto: link in new window

#### 9. redirectToSupportForm
**Purpose:** Open ElevenLabs support form with pre-filled data
**Parameters:**
- `subject` (string, required) - Support request title
- `description` (string, required) - Problem description
- `extraInfo` (string, optional) - Technical details

**Implementation:** Opens ElevenLabs support portal with query parameters

#### 10. redirectToExternalURL
**Purpose:** Safely open external URLs
**Parameters:**
- `url` (string, required) - Valid HTTP/HTTPS URL

**Implementation:** Opens URL in new tab with security flags

## Integration Details

### Widget Registration
The `el-widget.js` file handles tool registration:
```javascript
widget.addEventListener('elevenlabs-convai:call', (event) => {
  if (window.ClientTools) {
    event.detail.config.clientTools = window.ClientTools;
  }
});
```

### Error Handling
- All tools include comprehensive error handling
- Location tool handles geolocation permission issues
- Debug logging throughout for troubleshooting
- Graceful fallbacks for API failures

### Data Storage
- Blood pressure readings: `localStorage.getItem('bpReadings')`
- Medication reminders: `localStorage.getItem('medicationReminders')`
- All data stored as JSON arrays

### Testing
Test the implementation by:
1. Opening `empty.html` in browser
2. Starting conversation with coach agent
3. Testing each tool with appropriate voice commands:
   - "My blood pressure is 120 over 80"
   - "Show me my history" 
   - "What time is it?"
   - "Where am I?"
   - etc.

## Debugging

Enable debugging by checking browser console for:
- `✅ ClientTools loaded successfully` - Confirms script loading
- `🔧 Widget call event triggered` - Confirms tool registration
- Tool-specific debug messages with emoji prefixes

## Common Issues

### Tools Not Found
**Error:** "Client tool with name X is not defined on client"
**Solution:** Check script loading order in HTML

### Location Permission
**Issue:** User denies location access
**Behavior:** Tool returns permission denied message, doesn't crash

### Old Test Data
**Issue:** getBloodPressureHistory shows no recent data
**Solution:** Tool auto-generates recent test data for demonstration

## Version History

- **v1.0** - Initial implementation with 2 tools
- **v1.1** - Added 6 additional tools, modularized code
- **v1.2** - Added getCurrentDateTime and getLocation tools
- **v1.3** - Enhanced getBloodPressureHistory with auto-test data
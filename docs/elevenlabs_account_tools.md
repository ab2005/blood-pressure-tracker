# ElevenLabs Account Tools

Retrieved from: https://api.elevenlabs.io/v1/convai/tools  
Date: 2025-07-02 (Updated with getCurrentDateTime and getLocation)

## Tool 1: logBloodPressure
- **ID:** `EVn5DZZ3W2nN4Uli5yUh`
- **Type:** client
- **Description:** Log a blood pressure reading with systolic and diastolic values. Use when user mentions BP readings like '120 over 80' or wants to record a measurement.
- **Response Timeout:** 20 seconds
- **Expects Response:** false
- **Parameters:**
  - `systolic` (number, required) - The systolic blood pressure value (top number). Should be a number between 70-200 mmHg.
  - `diastolic` (number, required) - The diastolic blood pressure value (bottom number). Should be a number between 40-120 mmHg.
  - `pulse` (number, optional) - Heart rate in beats per minute (optional).
  - `time` (string, optional) - Time of measurement in ISO format.
  - `details` (string, optional) - Additional notes about the measurement.
- **Access Info:**
  - Creator: ab2005@gmail.com
  - Role: admin
  - Is Creator: true

## Tool 2: redirectToEmailSupport
- **ID:** `YZWDTpxVCdLh3z41y3aO`
- **Type:** client
- **Description:** Отправить емейл в группу поддержки (Send email to support group)
- **Response Timeout:** 20 seconds
- **Expects Response:** false
- **Parameters:**
  - `subject` (string, required) - Email subject
  - `body` (string, required) - Email body
- **Access Info:**
  - Creator: ab2005@gmail.com
  - Role: admin
  - Is Creator: true

## Tool 3: getBloodPressureHistory
- **ID:** `aZeqkq6yHUnhTr6UQw1Y`
- **Type:** client
- **Description:** Get blood pressure history for specified number of days. Returns recent readings from localStorage.
- **Response Timeout:** 20 seconds
- **Expects Response:** true
- **Parameters:**
  - `days` (number, optional) - Number of days to retrieve history for (default: 7)
- **Access Info:**
  - Creator: ab2005@gmail.com
  - Role: admin
  - Is Creator: true

## Tool 4: analyzeBloodPressure
- **ID:** `CVyO7tgD9N9VLeahktdG`
- **Type:** client
- **Description:** Analyze blood pressure readings and provide medical category classification (Normal, Elevated, Stage 1/2 Hypertension, Crisis).
- **Response Timeout:** 20 seconds
- **Expects Response:** true
- **Parameters:**
  - `systolic` (number, required) - Systolic blood pressure value for analysis
  - `diastolic` (number, required) - Diastolic blood pressure value for analysis
- **Access Info:**
  - Creator: ab2005@gmail.com
  - Role: admin
  - Is Creator: true

## Tool 5: setMedicationReminder
- **ID:** `Kq4xtvQyAAyuGTer0wx8`
- **Type:** client
- **Description:** Set medication reminder with time, frequency and notes. Stores reminder in localStorage for scheduling.
- **Response Timeout:** 20 seconds
- **Expects Response:** true
- **Parameters:**
  - `medication` (string, required) - Name of the medication
  - `time` (string, required) - Time to take medication (e.g. 08:00, 14:30)
  - `frequency` (string, optional) - How often to take (e.g. daily, twice daily)
  - `notes` (string, optional) - Additional notes about the medication
- **Access Info:**
  - Creator: ab2005@gmail.com
  - Role: admin
  - Is Creator: true

## Tool 6: redirectToDocs
- **ID:** `UNqTooKYfXfDw9YpP09l`
- **Type:** client
- **Description:** Redirect user to documentation or help pages using Next.js router navigation.
- **Response Timeout:** 20 seconds
- **Expects Response:** false
- **Parameters:**
  - `path` (string, required) - Path to documentation page to navigate to
- **Access Info:**
  - Creator: ab2005@gmail.com
  - Role: admin
  - Is Creator: true

## Tool 7: redirectToSupportForm
- **ID:** `oq6GjZgIvFZ7U0boMQik`
- **Type:** client
- **Description:** Open ElevenLabs support form with pre-filled information for user assistance requests.
- **Response Timeout:** 20 seconds
- **Expects Response:** false
- **Parameters:**
  - `subject` (string, required) - Subject/title of the support request
  - `description` (string, required) - Detailed description of the problem or request
  - `extraInfo` (string, optional) - Additional technical information or context
- **Access Info:**
  - Creator: ab2005@gmail.com
  - Role: admin
  - Is Creator: true

## Tool 8: redirectToExternalURL
- **ID:** `GOi5FmdSF4pB3Un4Rkf1`
- **Type:** client
- **Description:** Open external URLs in new browser tab. Use for redirecting to external websites or resources.
- **Response Timeout:** 20 seconds
- **Expects Response:** false
- **Parameters:**
  - `url` (string, required) - Valid HTTP/HTTPS URL to open in new tab
- **Access Info:**
  - Creator: ab2005@gmail.com
  - Role: admin
  - Is Creator: true

## Tool 9: getCurrentDateTime
- **ID:** `KgdcXahomJYoOYiEY4ji`
- **Type:** client
- **Description:** Get the current date and time in a user-friendly format. No parameters needed.
- **Response Timeout:** 10 seconds
- **Expects Response:** true
- **Parameters:** None required
- **Access Info:**
  - Creator: ab2005@gmail.com
  - Role: admin
  - Is Creator: true

## Tool 10: getLocation
- **ID:** `shG8Dt4m6oH1kzfnU6Fg`
- **Type:** client
- **Description:** Get user location with city, country, coordinates and accuracy. Requires location permission from browser.
- **Response Timeout:** 15 seconds
- **Expects Response:** true
- **Parameters:** None required
- **Access Info:**
  - Creator: ab2005@gmail.com
  - Role: admin
  - Is Creator: true

## Summary

**Total Tools:** 10  
**Coach Agent ID:** `agent_01jya9mcwzfyergjnaja2atc7m`

### Tool Categories:
- **Health Tracking (3):** logBloodPressure, getBloodPressureHistory, analyzeBloodPressure
- **Medication Management (1):** setMedicationReminder  
- **Support & Navigation (4):** redirectToEmailSupport, redirectToDocs, redirectToSupportForm, redirectToExternalURL
- **Utility (2):** getCurrentDateTime, getLocation

## Recent Updates

**2025-07-02:** Added 8 new tools to expand functionality:
- ✅ **getBloodPressureHistory** - View recent BP readings with auto-generated test data
- ✅ **analyzeBloodPressure** - Medical classification of BP readings  
- ✅ **setMedicationReminder** - Schedule medication alerts
- ✅ **redirectToDocs** - Navigate to documentation pages
- ✅ **redirectToSupportForm** - Open pre-filled support forms
- ✅ **redirectToExternalURL** - Open external links safely
- ✅ **getCurrentDateTime** - Get formatted current date and time
- ✅ **getLocation** - Geolocation with reverse geocoding

**Key Improvements:**
- Fixed script loading order issues preventing tool registration
- Updated `expects_response` flags for tools that return data
- Added comprehensive debugging and error handling
- Modularized client tools into separate `client-tools.js` file
- Enhanced `getBloodPressureHistory` with auto-test data for demonstrations

**Coach Agent Configuration:**
- All 10 tools are now active and functional
- Tools are properly registered via the ElevenLabs widget
- Client-side implementations match server-side configurations

## API Reference

**List Tools Endpoint:**
```
GET https://api.elevenlabs.io/v1/convai/tools
Headers: xi-api-key: YOUR_API_KEY
```

**Create Tool Endpoint:**
```
POST https://api.elevenlabs.io/v1/convai/tools
Headers: xi-api-key: YOUR_API_KEY
Content-Type: application/json
```

**Update Tool Endpoint:**
```
PATCH https://api.elevenlabs.io/v1/convai/tools/{tool_id}
Headers: xi-api-key: YOUR_API_KEY
Content-Type: application/json
```

**Update Agent Tools:**
```
PATCH https://api.elevenlabs.io/v1/convai/agents/{agent_id}
Headers: xi-api-key: YOUR_API_KEY
Content-Type: application/json
Body: {"conversation_config":{"agent":{"prompt":{"tool_ids":["id1","id2"...]}}}}
```
# ElevenLabs Account Tools

Retrieved from: https://api.elevenlabs.io/v1/convai/tools  
Date: 2025-07-02

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

## Raw JSON Response

```json
{
  "tools": [
    {
      "id": "EVn5DZZ3W2nN4Uli5yUh",
      "tool_config": {
        "name": "logBloodPressure",
        "description": "Log a blood pressure reading with systolic and diastolic values. Use when user mentions BP readings like '120 over 80' or wants to record a measurement.",
        "response_timeout_secs": 20,
        "type": "client",
        "parameters": {
          "type": "object",
          "required": ["systolic", "diastolic"],
          "description": "",
          "properties": {
            "systolic": {
              "type": "number",
              "description": "The systolic blood pressure value (top number). Should be a number between 70-200 mmHg.",
              "dynamic_variable": "",
              "constant_value": ""
            },
            "diastolic": {
              "type": "number",
              "description": "The diastolic blood pressure value (bottom number). Should be a number between 40-120 mmHg.",
              "dynamic_variable": "",
              "constant_value": ""
            },
            "pulse": {
              "type": "number",
              "description": "Heart rate in beats per minute (optional).",
              "dynamic_variable": "",
              "constant_value": ""
            },
            "time": {
              "type": "string",
              "description": "Time of measurement in ISO format.",
              "dynamic_variable": "",
              "constant_value": ""
            },
            "details": {
              "type": "string",
              "description": "Additional notes about the measurement.",
              "dynamic_variable": "",
              "constant_value": ""
            }
          }
        },
        "expects_response": false,
        "dynamic_variables": {
          "dynamic_variable_placeholders": {}
        }
      },
      "access_info": {
        "is_creator": true,
        "creator_name": "ab2005@gmail.com",
        "creator_email": "ab2005@gmail.com",
        "role": "admin"
      }
    },
    {
      "id": "YZWDTpxVCdLh3z41y3aO",
      "tool_config": {
        "name": "redirectToEmailSupport",
        "description": "Отправить емейл в группу поддержки",
        "response_timeout_secs": 20,
        "type": "client",
        "parameters": {
          "type": "object",
          "required": ["subject", "body"],
          "description": "",
          "properties": {
            "subject": {
              "type": "string",
              "description": "Email subject",
              "dynamic_variable": "",
              "constant_value": ""
            },
            "body": {
              "type": "string",
              "description": "Email body. ",
              "dynamic_variable": "",
              "constant_value": ""
            }
          }
        },
        "expects_response": false,
        "dynamic_variables": {
          "dynamic_variable_placeholders": {}
        }
      },
      "access_info": {
        "is_creator": true,
        "creator_name": "ab2005@gmail.com",
        "creator_email": "ab2005@gmail.com",
        "role": "admin"
      }
    }
  ]
}
```
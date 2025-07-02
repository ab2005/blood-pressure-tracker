# ElevenLabs Conversational AI Tools API Reference

Based on documentation from: https://elevenlabs.io/docs/conversational-ai/api-reference/tools

## Overview

The ElevenLabs Tools API allows you to list and manage tools for conversational AI agents.

## API Endpoint

### List Tools

**Method:** `GET`  
**URL:** `https://api.elevenlabs.io/v1/convai/tools`

### Request Headers

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `xi-api-key` | string | Yes | Your ElevenLabs API key |

### Response Structure

The API returns a JSON object containing an array of tools:

```json
{
  "tools": [
    {
      "id": "string",
      "tool_config": {
        "name": "string",
        "description": "string", 
        "type": "webhook",
        "response_timeout_secs": number
      },
      "access_info": {
        "creator": "string",
        "role": "string"
      }
    }
  ]
}
```

### Tool Configuration Properties

- **id** - Unique identifier for the tool
- **tool_config** - Configuration object containing:
  - **name** - Tool name
  - **description** - Tool description
  - **type** - Tool type (e.g., "webhook")
  - **response_timeout_secs** - Timeout in seconds for tool responses
- **access_info** - Access information including creator and role details

### Python SDK Example

```python
from elevenlabs import ElevenLabs

client = ElevenLabs(
    api_key="YOUR_API_KEY",
)

# List all tools
tools = client.conversational_ai.tools.list()
```

### Error Responses

- **422 Unprocessable Entity** - May occur for invalid requests

### Sample Response

```json
{
  "tools": [
    {
      "id": "foo",
      "tool_config": {
        "name": "foo",
        "description": "foo",
        "type": "webhook"
      }
    }
  ]
}
```

## Notes

- This documentation appears to be a work in progress with limited detailed information about specific tool configurations
- Additional endpoints for creating, updating, and deleting tools may be available but are not documented in this reference
- Tool types may include "webhook", "client", and other types as mentioned in other parts of the ElevenLabs documentation
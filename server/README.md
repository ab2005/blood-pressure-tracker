# ElevenLabs-Telnyx Phone Server

A production-ready Node.js server that provides webhook endpoints for ElevenLabs conversational AI to make phone calls using the Telnyx Voice API.

## Features

- **Emergency Calls**: Automated emergency calls with TTS messages for critical health situations
- **Check-in Calls**: Scheduled medication reminders and health check-ins
- **ElevenLabs Integration**: High-quality text-to-speech using ElevenLabs API
- **Telnyx Voice API**: Reliable phone call delivery via Telnyx telecommunications
- **Security**: Webhook signature validation, rate limiting, CORS protection
- **Monitoring**: Comprehensive logging, health checks, and call status tracking
- **Production Ready**: Docker deployment, Nginx reverse proxy, graceful shutdown

## Quick Start

### 1. Environment Setup

```bash
# Clone and navigate to server directory
cd server

# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

### 2. Required API Keys

#### Telnyx Setup
1. Create account at [telnyx.com](https://telnyx.com)
2. Get API key from Telnyx Portal
3. Create an Outbound Voice Profile connection
4. Purchase a phone number for outbound calls

#### ElevenLabs Setup
1. Create account at [elevenlabs.io](https://elevenlabs.io)
2. Get API key from account settings
3. Minimum "Starter" subscription required for API access

### 3. Configure Environment

```env
# Telnyx Configuration
TELNYX_API_KEY=KEY017...your_telnyx_api_key
TELNYX_CONNECTION_ID=your_connection_id
TELNYX_FROM_NUMBER=+12345678901

# ElevenLabs Configuration
ELEVENLABS_API_KEY=sk_...your_elevenlabs_api_key

# Server Configuration
PORT=3000
NODE_ENV=production
SECRET_KEY=your_secret_key_for_webhook_validation
```

### 4. Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Test the server
curl http://localhost:3000/health
```

### 5. Production Deployment

#### Docker Deployment

```bash
# Build and start services
docker-compose -f docker/docker-compose.yml up -d

# Check logs
docker-compose -f docker/docker-compose.yml logs -f

# Stop services
docker-compose -f docker/docker-compose.yml down
```

#### Manual Deployment

```bash
# Install production dependencies
npm ci --only=production

# Start server
npm start
```

## API Endpoints

### Emergency Call Webhook
**POST** `/api/webhook/emergency-call`

Initiates an emergency call with TTS message.

```json
{
  "phoneNumber": "+19995551234",
  "reason": "Hypertensive crisis detected",
  "bloodPressure": "185/125",
  "patientName": "John Smith",
  "location": "123 Main St, Anytown"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Emergency call initiated successfully",
  "callId": "call_abc123",
  "estimatedDuration": "45 seconds"
}
```

### Check-in Call Webhook
**POST** `/api/webhook/checkin-call`

Schedules or initiates a health check-in call.

```json
{
  "phoneNumber": "+19995551234",
  "message": "Time to take your blood pressure medication",
  "scheduledTime": "08:00",
  "patientName": "Jane Doe",
  "reminderType": "medication"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Check-in call scheduled successfully",
  "callId": "call_def456",
  "scheduledTime": "08:00"
}
```

### Call Status Updates
**POST** `/api/webhook/call-status`

Receives status updates from Telnyx about call progress.

### Health Check
**GET** `/health`

Returns server and service status.

```json
{
  "status": "healthy",
  "timestamp": "2025-01-07T10:30:00.000Z",
  "version": "1.0.0",
  "services": {
    "telnyx": { "configured": true, "activeCalls": 0 },
    "elevenlabs": { "configured": true }
  }
}
```

## ElevenLabs Tool Configuration

### Add Webhook Tools to ElevenLabs

1. **Emergency Call Tool**
   - Type: `webhook`
   - Name: `makeEmergencyCall`
   - URL: `https://your-domain.com/api/webhook/emergency-call`
   - Method: `POST`

2. **Check-in Call Tool**
   - Type: `webhook`
   - Name: `scheduleCheckInCall`
   - URL: `https://your-domain.com/api/webhook/checkin-call`
   - Method: `POST`

### Tool Configuration JSON

Use the provided `../server-tools-definition.json` file to configure tools in your ElevenLabs agent.

## Call Flow

### Emergency Call Flow
1. **Trigger**: Critical health parameters detected
2. **TTS Generation**: ElevenLabs creates urgent voice message
3. **Call Initiation**: Telnyx places call to emergency contact
4. **Message Delivery**: Automated voice message with health details
5. **Status Updates**: Real-time call progress via webhooks

### Check-in Call Flow
1. **Trigger**: Scheduled reminder or immediate check-in
2. **TTS Generation**: ElevenLabs creates friendly reminder message
3. **Call Scheduling**: Immediate or scheduled call via Telnyx
4. **Message Delivery**: Personalized health reminder
5. **Completion**: Call ends after message delivery

## Monitoring & Logging

### Log Levels
- `error`: System errors and failures
- `warn`: Rate limits, validation failures
- `info`: Call initiations, completions
- `debug`: Detailed webhook events

### Key Metrics
- Call success/failure rates
- Average call duration
- TTS generation time
- API response times
- Active call count

### Health Monitoring

```bash
# Check server health
curl https://your-domain.com/health

# Check specific service status
curl https://your-domain.com/health?token=your_health_token
```

## Security Features

- **Webhook Signature Validation**: Verify request authenticity
- **Rate Limiting**: Prevent API abuse
- **CORS Protection**: Restrict cross-origin requests
- **Input Validation**: Sanitize all inputs
- **HTTPS Enforcement**: SSL/TLS encryption required
- **Phone Number Masking**: Protect sensitive data in logs

## Troubleshooting

### Common Issues

1. **Calls Not Connecting**
   - Verify Telnyx connection ID and from number
   - Check phone number format (E.164)
   - Confirm webhook URL is publicly accessible

2. **TTS Generation Fails**
   - Verify ElevenLabs API key and subscription
   - Check text length limits
   - Monitor API quota usage

3. **Webhook Signature Validation Fails**
   - Ensure SECRET_KEY matches in both client and server
   - Check timestamp drift (within 5 minutes)
   - Verify request body is not modified

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=debug

# Test with development environment
export NODE_ENV=development
npm run dev
```

### Testing

```bash
# Run tests
npm test

# Test emergency call (development only)
curl -X POST http://localhost:3000/api/test/call \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+19995551234", "message": "Test call", "type": "test"}'
```

## Cost Considerations

### Telnyx Pricing
- Outbound calls: ~$0.004-0.01 per minute (US)
- Phone number rental: ~$1-2 per month
- No setup fees

### ElevenLabs Pricing
- TTS generation: ~$0.18 per 1K characters
- Starter plan: $5/month (30K characters)
- Creator plan: $22/month (100K characters)

### Estimated Costs
- Emergency call (45 seconds): ~$0.01-0.02
- Check-in call (30 seconds): ~$0.005-0.01
- TTS generation: ~$0.01-0.05 per call

## Support

For issues related to:
- **Telnyx**: [Telnyx Support](https://telnyx.com/support)
- **ElevenLabs**: [ElevenLabs Discord](https://elevenlabs.io/discord)
- **This Server**: Create issue in repository

## License

MIT License - see LICENSE file for details.
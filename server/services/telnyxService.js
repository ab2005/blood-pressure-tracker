const telnyx = require('telnyx');
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

class TelnyxService {
  constructor() {
    if (!process.env.TELNYX_API_KEY) {
      throw new Error('TELNYX_API_KEY environment variable is required');
    }

    this.client = telnyx(process.env.TELNYX_API_KEY);
    this.connectionId = process.env.TELNYX_CONNECTION_ID;
    this.fromNumber = process.env.TELNYX_FROM_NUMBER;
    
    if (!this.connectionId || !this.fromNumber) {
      logger.warn('TELNYX_CONNECTION_ID or TELNYX_FROM_NUMBER not configured');
    }

    this.activeCalls = new Map();
  }

  getStatus() {
    return {
      configured: !!this.client,
      connectionId: !!this.connectionId,
      fromNumber: !!this.fromNumber,
      activeCalls: this.activeCalls.size
    };
  }

  async makeEmergencyCall({ toNumber, audioBuffer, callbackUrl, metadata = {} }) {
    try {
      logger.info('Initiating emergency call', {
        toNumber: toNumber.replace(/\d{4}$/, '****'),
        hasAudio: !!audioBuffer,
        callbackUrl
      });

      // Upload audio to Telnyx media library
      const mediaUrl = await this.uploadAudio(audioBuffer, `emergency_${Date.now()}.wav`);

      // Create call
      const call = await this.client.calls.create({
        connection_id: this.connectionId,
        to: toNumber,
        from: this.fromNumber,
        webhook_url: callbackUrl,
        webhook_url_method: 'POST',
        client_state: Buffer.from(JSON.stringify({
          type: 'emergency',
          mediaUrl: mediaUrl,
          ...metadata
        })).toString('base64')
      });

      this.activeCalls.set(call.data.call_control_id, {
        type: 'emergency',
        toNumber: toNumber,
        mediaUrl: mediaUrl,
        startTime: new Date(),
        metadata: metadata
      });

      logger.info('Emergency call created', {
        callId: call.data.call_control_id,
        status: call.data.call_status
      });

      return {
        callId: call.data.call_control_id,
        status: call.data.call_status,
        mediaUrl: mediaUrl
      };

    } catch (error) {
      logger.error('Emergency call failed', {
        error: error.message,
        toNumber: toNumber.replace(/\d{4}$/, '****')
      });
      throw new Error(`Failed to initiate emergency call: ${error.message}`);
    }
  }

  async makeCheckInCall({ toNumber, audioBuffer, scheduledTime, callbackUrl, metadata = {} }) {
    try {
      logger.info('Initiating check-in call', {
        toNumber: toNumber.replace(/\d{4}$/, '****'),
        hasAudio: !!audioBuffer,
        scheduledTime,
        callbackUrl
      });

      // Upload audio to Telnyx media library
      const mediaUrl = await this.uploadAudio(audioBuffer, `checkin_${Date.now()}.wav`);

      // If scheduled time is provided, we would typically use a job queue
      // For now, we'll make immediate calls and log the scheduled time
      if (scheduledTime && scheduledTime !== 'сейчас') {
        logger.info('Scheduled call requested', { scheduledTime, toNumber: toNumber.replace(/\d{4}$/, '****') });
        // In production, you would integrate with a job queue like Bull, Agenda, or similar
        // For demo purposes, we'll proceed with immediate call
      }

      // Create call
      const call = await this.client.calls.create({
        connection_id: this.connectionId,
        to: toNumber,
        from: this.fromNumber,
        webhook_url: callbackUrl,
        webhook_url_method: 'POST',
        client_state: Buffer.from(JSON.stringify({
          type: 'checkin',
          mediaUrl: mediaUrl,
          scheduledTime: scheduledTime,
          ...metadata
        })).toString('base64')
      });

      this.activeCalls.set(call.data.call_control_id, {
        type: 'checkin',
        toNumber: toNumber,
        mediaUrl: mediaUrl,
        scheduledTime: scheduledTime,
        startTime: new Date(),
        metadata: metadata
      });

      logger.info('Check-in call created', {
        callId: call.data.call_control_id,
        status: call.data.call_status
      });

      return {
        callId: call.data.call_control_id,
        status: call.data.call_status,
        mediaUrl: mediaUrl,
        scheduledTime: scheduledTime
      };

    } catch (error) {
      logger.error('Check-in call failed', {
        error: error.message,
        toNumber: toNumber.replace(/\d{4}$/, '****')
      });
      throw new Error(`Failed to initiate check-in call: ${error.message}`);
    }
  }

  async makeTestCall({ toNumber, audioBuffer, callbackUrl }) {
    try {
      logger.info('Initiating test call', {
        toNumber: toNumber.replace(/\d{4}$/, '****'),
        hasAudio: !!audioBuffer
      });

      const mediaUrl = await this.uploadAudio(audioBuffer, `test_${Date.now()}.wav`);

      const call = await this.client.calls.create({
        connection_id: this.connectionId,
        to: toNumber,
        from: this.fromNumber,
        webhook_url: callbackUrl,
        webhook_url_method: 'POST',
        client_state: Buffer.from(JSON.stringify({
          type: 'test',
          mediaUrl: mediaUrl
        })).toString('base64')
      });

      this.activeCalls.set(call.data.call_control_id, {
        type: 'test',
        toNumber: toNumber,
        mediaUrl: mediaUrl,
        startTime: new Date()
      });

      return {
        callId: call.data.call_control_id,
        status: call.data.call_status,
        mediaUrl: mediaUrl
      };

    } catch (error) {
      logger.error('Test call failed', { error: error.message });
      throw new Error(`Failed to initiate test call: ${error.message}`);
    }
  }

  async answerCall(callControlId) {
    try {
      const response = await this.client.calls.answer({
        call_control_id: callControlId
      });

      logger.info('Call answered', { callId: callControlId });

      // Play the audio message after answering
      const callData = this.activeCalls.get(callControlId);
      if (callData && callData.mediaUrl) {
        await this.playAudio(callControlId, callData.mediaUrl);
      }

      return response.data;
    } catch (error) {
      logger.error('Failed to answer call', { callId: callControlId, error: error.message });
      throw error;
    }
  }

  async playAudio(callControlId, mediaUrl) {
    try {
      const response = await this.client.calls.playback({
        call_control_id: callControlId,
        audio_url: mediaUrl,
        loop: 1
      });

      logger.info('Audio playback started', { callId: callControlId, mediaUrl });
      return response.data;
    } catch (error) {
      logger.error('Failed to play audio', { callId: callControlId, error: error.message });
      throw error;
    }
  }

  async hangupCall(callControlId) {
    try {
      const response = await this.client.calls.hangup({
        call_control_id: callControlId
      });

      // Remove from active calls
      this.activeCalls.delete(callControlId);

      logger.info('Call hung up', { callId: callControlId });
      return response.data;
    } catch (error) {
      logger.error('Failed to hangup call', { callId: callControlId, error: error.message });
      throw error;
    }
  }

  async uploadAudio(audioBuffer, filename) {
    try {
      // Convert buffer to base64 for Telnyx media upload
      const base64Audio = audioBuffer.toString('base64');
      
      // Create media resource
      const media = await this.client.media.upload({
        media_name: filename,
        content_type: 'audio/wav',
        media_content: base64Audio
      });

      const mediaUrl = media.data.media_url;
      logger.info('Audio uploaded to Telnyx', { filename, mediaUrl });

      return mediaUrl;
    } catch (error) {
      logger.error('Audio upload failed', { filename, error: error.message });
      throw new Error(`Failed to upload audio: ${error.message}`);
    }
  }

  async getCallStatus(callControlId) {
    try {
      const response = await this.client.calls.retrieve(callControlId);
      return response.data;
    } catch (error) {
      logger.error('Failed to get call status', { callId: callControlId, error: error.message });
      throw error;
    }
  }

  getActiveCall(callControlId) {
    return this.activeCalls.get(callControlId);
  }

  getAllActiveCalls() {
    return Array.from(this.activeCalls.entries()).map(([callId, data]) => ({
      callId,
      ...data
    }));
  }

  // Handle webhook events
  async handleWebhookEvent(eventData) {
    const { event_type, payload } = eventData;
    const callControlId = payload.call_control_id;

    try {
      switch (event_type) {
        case 'call.initiated':
          logger.info('Call initiated webhook', { callId: callControlId });
          break;

        case 'call.ringing':
          logger.info('Call ringing webhook', { callId: callControlId });
          break;

        case 'call.answered':
          logger.info('Call answered webhook', { callId: callControlId });
          await this.answerCall(callControlId);
          break;

        case 'call.hangup':
          logger.info('Call hangup webhook', { 
            callId: callControlId, 
            hangupCause: payload.hangup_cause 
          });
          this.activeCalls.delete(callControlId);
          break;

        case 'call.playback.ended':
          logger.info('Playback ended webhook', { callId: callControlId });
          // Hangup after playback ends
          await this.hangupCall(callControlId);
          break;

        case 'call.playback.failed':
          logger.error('Playback failed webhook', { 
            callId: callControlId, 
            error: payload.error 
          });
          await this.hangupCall(callControlId);
          break;

        default:
          logger.debug('Unhandled webhook event', { eventType: event_type, callId: callControlId });
      }
    } catch (error) {
      logger.error('Webhook event handling failed', {
        eventType: event_type,
        callId: callControlId,
        error: error.message
      });
    }
  }
}

// Create singleton instance
const telnyxService = new TelnyxService();

module.exports = telnyxService;
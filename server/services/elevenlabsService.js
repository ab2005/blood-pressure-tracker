const axios = require('axios');
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

class ElevenLabsService {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.baseURL = 'https://api.elevenlabs.io/v1';
    
    if (!this.apiKey) {
      logger.warn('ELEVENLABS_API_KEY not configured - using fallback TTS');
    }

    // Default voice settings
    this.defaultVoice = {
      voice_id: 'pNInz6obpgDQGcFmaJgB', // Adam voice
      stability: 0.5,
      similarity_boost: 0.8,
      style: 0.0,
      use_speaker_boost: true
    };

    this.emergencyVoice = {
      voice_id: 'EXAVITQu4vr4xnSDxMaL', // Bella voice - clear and authoritative
      stability: 0.7,
      similarity_boost: 0.9,
      style: 0.2,
      use_speaker_boost: true
    };
  }

  getStatus() {
    return {
      configured: !!this.apiKey,
      baseURL: this.baseURL,
      defaultVoice: this.defaultVoice.voice_id
    };
  }

  async generateSpeech(text, options = {}) {
    try {
      if (!this.apiKey) {
        // Fallback to a simple TTS simulation
        logger.warn('ElevenLabs not configured, using fallback TTS');
        return this.generateFallbackTTS(text);
      }

      const isEmergency = options.isEmergency || false;
      const voice = isEmergency ? this.emergencyVoice : this.defaultVoice;

      logger.info('Generating speech with ElevenLabs', {
        textLength: text.length,
        voiceId: voice.voice_id,
        isEmergency: isEmergency
      });

      const response = await axios.post(
        `${this.baseURL}/text-to-speech/${voice.voice_id}`,
        {
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: voice.stability,
            similarity_boost: voice.similarity_boost,
            style: voice.style,
            use_speaker_boost: voice.use_speaker_boost
          }
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey
          },
          responseType: 'arraybuffer',
          timeout: 30000 // 30 second timeout
        }
      );

      const audioBuffer = Buffer.from(response.data);
      logger.info('Speech generated successfully', {
        audioSize: audioBuffer.length,
        voiceId: voice.voice_id
      });

      return audioBuffer;

    } catch (error) {
      logger.error('Speech generation failed', {
        error: error.message,
        textLength: text.length,
        isAxiosError: !!error.isAxiosError,
        status: error.response?.status,
        statusText: error.response?.statusText
      });

      if (error.response?.status === 401) {
        throw new Error('Invalid ElevenLabs API key');
      } else if (error.response?.status === 429) {
        throw new Error('ElevenLabs rate limit exceeded');
      } else if (error.response?.status === 422) {
        throw new Error('Invalid request to ElevenLabs API');
      }

      // Fallback to simple TTS on any error
      logger.warn('Falling back to simple TTS due to ElevenLabs error');
      return this.generateFallbackTTS(text);
    }
  }

  generateFallbackTTS(text) {
    // Create a simple WAV file with silence as fallback
    // In production, you might want to use a different TTS service as fallback
    logger.info('Generating fallback TTS', { textLength: text.length });

    // Calculate approximate duration (assume 150 words per minute)
    const words = text.split(' ').length;
    const durationSeconds = Math.max(5, Math.ceil((words / 150) * 60));

    // Create a minimal WAV header for silence
    const sampleRate = 22050;
    const samples = sampleRate * durationSeconds;
    const dataSize = samples * 2; // 16-bit samples
    const fileSize = 44 + dataSize;

    const buffer = Buffer.alloc(44 + dataSize);
    
    // WAV header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(fileSize - 8, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // Format chunk size
    buffer.writeUInt16LE(1, 20);  // Audio format (PCM)
    buffer.writeUInt16LE(1, 22);  // Number of channels
    buffer.writeUInt32LE(sampleRate, 24); // Sample rate
    buffer.writeUInt32LE(sampleRate * 2, 28); // Byte rate
    buffer.writeUInt16LE(2, 32);  // Block align
    buffer.writeUInt16LE(16, 34); // Bits per sample
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    // Fill with silence (zeros)
    buffer.fill(0, 44);

    logger.info('Fallback TTS generated', {
      duration: durationSeconds,
      size: buffer.length
    });

    return buffer;
  }

  async getVoices() {
    try {
      if (!this.apiKey) {
        throw new Error('ElevenLabs API key not configured');
      }

      const response = await axios.get(`${this.baseURL}/voices`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      return response.data.voices;
    } catch (error) {
      logger.error('Failed to get voices', { error: error.message });
      throw error;
    }
  }

  async getSubscriptionInfo() {
    try {
      if (!this.apiKey) {
        throw new Error('ElevenLabs API key not configured');
      }

      const response = await axios.get(`${this.baseURL}/user/subscription`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to get subscription info', { error: error.message });
      throw error;
    }
  }

  // Generate speech optimized for emergency calls
  async generateEmergencySpeech(text, patientName = null, bloodPressure = null) {
    let emergencyText = text;

    // Add urgency markers for better TTS emphasis
    if (patientName) {
      emergencyText = emergencyText.replace(patientName, `${patientName}!`);
    }

    if (bloodPressure) {
      emergencyText = emergencyText.replace(bloodPressure, `${bloodPressure}. This is critical!`);
    }

    // Add pauses and emphasis
    emergencyText = emergencyText
      .replace(/emergency/gi, 'EMERGENCY')
      .replace(/critical/gi, 'CRITICAL')
      .replace(/immediately/gi, 'IMMEDIATELY');

    return this.generateSpeech(emergencyText, { isEmergency: true });
  }

  // Generate speech optimized for check-in calls
  async generateCheckInSpeech(text, patientName = null) {
    let checkInText = text;

    // Make it more conversational and friendly
    if (patientName) {
      checkInText = `Hello ${patientName}! ${checkInText}`;
    }

    // Add natural pauses
    checkInText = checkInText
      .replace(/\. /g, '... ')
      .replace(/medication/gi, 'medication,')
      .replace(/appointment/gi, 'appointment,');

    return this.generateSpeech(checkInText, { isEmergency: false });
  }
}

// Create singleton instance
const elevenlabsService = new ElevenLabsService();

module.exports = elevenlabsService;
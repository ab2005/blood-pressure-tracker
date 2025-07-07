const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const Joi = require('joi');
const crypto = require('crypto');
require('dotenv').config();

const telnyxService = require('./services/telnyxService');
const elevenlabsService = require('./services/elevenlabsService');
const { validateWebhookSignature } = require('./utils/security');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure logging
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: process.env.LOG_FILE || './logs/server.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method === 'POST' ? req.body : undefined
  });
  next();
});

// Validation schemas
const emergencyCallSchema = Joi.object({
  phoneNumber: Joi.string().pattern(/^\+[1-9]\d{1,14}$/).required(),
  reason: Joi.string().min(1).max(200).required(),
  bloodPressure: Joi.string().pattern(/^\d{2,3}\/\d{2,3}$/).optional(),
  patientName: Joi.string().max(100).optional(),
  location: Joi.string().max(200).optional()
});

const checkInCallSchema = Joi.object({
  phoneNumber: Joi.string().pattern(/^\+[1-9]\d{1,14}$/).required(),
  message: Joi.string().min(1).max(500).required(),
  scheduledTime: Joi.string().optional(),
  patientName: Joi.string().max(100).optional(),
  reminderType: Joi.string().valid('medication', 'appointment', 'checkup', 'general').optional()
});

// Health check endpoint
app.get('/health', (req, res) => {
  const token = req.query.token;
  if (process.env.HEALTH_CHECK_TOKEN && token !== process.env.HEALTH_CHECK_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: require('./package.json').version,
    environment: process.env.NODE_ENV,
    services: {
      telnyx: telnyxService.getStatus(),
      elevenlabs: elevenlabsService.getStatus()
    }
  });
});

// ElevenLabs webhook endpoint for emergency calls
app.post('/api/webhook/emergency-call', async (req, res) => {
  try {
    // Validate webhook signature if configured
    if (process.env.SECRET_KEY) {
      const isValid = validateWebhookSignature(req, process.env.SECRET_KEY);
      if (!isValid) {
        logger.warn('Invalid webhook signature for emergency call', { ip: req.ip });
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Validate request data
    const { error, value } = emergencyCallSchema.validate(req.body);
    if (error) {
      logger.warn('Emergency call validation failed', { error: error.details, body: req.body });
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details.map(d => d.message) 
      });
    }

    const { phoneNumber, reason, bloodPressure, patientName, location } = value;

    logger.info('Emergency call initiated', { 
      phoneNumber: phoneNumber.replace(/\d{4}$/, '****'), // Mask last 4 digits
      reason,
      bloodPressure 
    });

    // Create emergency message for TTS
    let emergencyMessage = `This is an emergency call from the Blood Pressure Tracker health monitoring system. `;
    
    if (patientName) {
      emergencyMessage += `This concerns ${patientName}. `;
    }
    
    emergencyMessage += `Emergency reason: ${reason}. `;
    
    if (bloodPressure) {
      emergencyMessage += `Current blood pressure reading is ${bloodPressure}. `;
    }
    
    if (location) {
      emergencyMessage += `Patient location: ${location}. `;
    }
    
    emergencyMessage += `Please respond immediately. This call was automatically generated due to critical health parameters detected by the monitoring system.`;

    // Generate audio using ElevenLabs
    const audioBuffer = await elevenlabsService.generateSpeech(emergencyMessage);

    // Make the call using Telnyx
    const callResult = await telnyxService.makeEmergencyCall({
      toNumber: phoneNumber,
      audioBuffer: audioBuffer,
      callbackUrl: `${req.protocol}://${req.get('host')}/api/webhook/call-status`,
      metadata: {
        type: 'emergency',
        reason: reason,
        bloodPressure: bloodPressure,
        timestamp: new Date().toISOString()
      }
    });

    logger.info('Emergency call successfully initiated', { 
      callId: callResult.callId,
      phoneNumber: phoneNumber.replace(/\d{4}$/, '****')
    });

    res.json({
      success: true,
      message: 'Emergency call initiated successfully',
      callId: callResult.callId,
      estimatedDuration: Math.ceil(emergencyMessage.length / 10) + ' seconds'
    });

  } catch (error) {
    logger.error('Emergency call failed', { 
      error: error.message, 
      stack: error.stack,
      body: req.body 
    });

    res.status(500).json({
      success: false,
      error: 'Failed to initiate emergency call',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ElevenLabs webhook endpoint for check-in calls
app.post('/api/webhook/checkin-call', async (req, res) => {
  try {
    // Validate webhook signature if configured
    if (process.env.SECRET_KEY) {
      const isValid = validateWebhookSignature(req, process.env.SECRET_KEY);
      if (!isValid) {
        logger.warn('Invalid webhook signature for check-in call', { ip: req.ip });
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Validate request data
    const { error, value } = checkInCallSchema.validate(req.body);
    if (error) {
      logger.warn('Check-in call validation failed', { error: error.details, body: req.body });
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details.map(d => d.message) 
      });
    }

    const { phoneNumber, message, scheduledTime, patientName, reminderType } = value;

    logger.info('Check-in call initiated', { 
      phoneNumber: phoneNumber.replace(/\d{4}$/, '****'),
      reminderType,
      scheduledTime 
    });

    // Create check-in message for TTS
    let checkInMessage = `Hello, this is an automated health check-in call from the Blood Pressure Tracker system. `;
    
    if (patientName) {
      checkInMessage += `This message is for ${patientName}. `;
    }
    
    checkInMessage += message;
    
    if (reminderType === 'medication') {
      checkInMessage += ` Please remember to take your medication as prescribed and monitor your blood pressure regularly.`;
    } else if (reminderType === 'appointment') {
      checkInMessage += ` Please remember your upcoming medical appointment.`;
    } else if (reminderType === 'checkup') {
      checkInMessage += ` Please take time to check your blood pressure and log the reading in your health tracker.`;
    }
    
    checkInMessage += ` Thank you for using our health monitoring service. Have a healthy day!`;

    // Generate audio using ElevenLabs
    const audioBuffer = await elevenlabsService.generateSpeech(checkInMessage);

    // Make the call using Telnyx
    const callResult = await telnyxService.makeCheckInCall({
      toNumber: phoneNumber,
      audioBuffer: audioBuffer,
      scheduledTime: scheduledTime,
      callbackUrl: `${req.protocol}://${req.get('host')}/api/webhook/call-status`,
      metadata: {
        type: 'checkin',
        reminderType: reminderType,
        timestamp: new Date().toISOString()
      }
    });

    logger.info('Check-in call successfully initiated', { 
      callId: callResult.callId,
      phoneNumber: phoneNumber.replace(/\d{4}$/, '****')
    });

    res.json({
      success: true,
      message: scheduledTime ? 'Check-in call scheduled successfully' : 'Check-in call initiated successfully',
      callId: callResult.callId,
      scheduledTime: scheduledTime,
      estimatedDuration: Math.ceil(checkInMessage.length / 10) + ' seconds'
    });

  } catch (error) {
    logger.error('Check-in call failed', { 
      error: error.message, 
      stack: error.stack,
      body: req.body 
    });

    res.status(500).json({
      success: false,
      error: 'Failed to initiate check-in call',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Telnyx webhook endpoint for call status updates
app.post('/api/webhook/call-status', async (req, res) => {
  try {
    const { data } = req.body;
    
    if (data && data.event_type) {
      logger.info('Call status update received', {
        eventType: data.event_type,
        callId: data.payload?.call_control_id,
        status: data.payload?.call_status
      });

      // Handle different call events
      switch (data.event_type) {
        case 'call.initiated':
          logger.info('Call initiated', { callId: data.payload.call_control_id });
          break;
        case 'call.answered':
          logger.info('Call answered', { callId: data.payload.call_control_id });
          break;
        case 'call.hangup':
          logger.info('Call ended', { 
            callId: data.payload.call_control_id,
            hangupCause: data.payload.hangup_cause
          });
          break;
        case 'call.playback.ended':
          // Hangup after message is played
          if (data.payload.call_control_id) {
            await telnyxService.hangupCall(data.payload.call_control_id);
          }
          break;
        default:
          logger.debug('Unhandled call event', { eventType: data.event_type });
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Call status webhook error', { error: error.message, body: req.body });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Test endpoint (only in development)
if (process.env.NODE_ENV === 'development') {
  app.post('/api/test/call', async (req, res) => {
    try {
      const { phoneNumber, message, type } = req.body;
      
      if (!phoneNumber || !message) {
        return res.status(400).json({ error: 'phoneNumber and message are required' });
      }

      const testMessage = `This is a test call from the Blood Pressure Tracker system. Test message: ${message}`;
      const audioBuffer = await elevenlabsService.generateSpeech(testMessage);
      
      const callResult = await telnyxService.makeTestCall({
        toNumber: phoneNumber,
        audioBuffer: audioBuffer,
        callbackUrl: `${req.protocol}://${req.get('host')}/api/webhook/call-status`
      });

      res.json({
        success: true,
        message: 'Test call initiated',
        callId: callResult.callId
      });
    } catch (error) {
      logger.error('Test call failed', { error: error.message });
      res.status(500).json({ error: 'Test call failed' });
    }
  });
}

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error', { 
    error: error.message, 
    stack: error.stack, 
    path: req.path 
  });

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`ElevenLabs-Telnyx Phone Server started on port ${PORT}`, {
    environment: process.env.NODE_ENV,
    version: require('./package.json').version
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

module.exports = app;
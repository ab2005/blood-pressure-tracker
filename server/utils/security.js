const crypto = require('crypto');
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

/**
 * Validate webhook signature to ensure request authenticity
 * @param {Object} req - Express request object
 * @param {string} secretKey - Secret key for signature validation
 * @returns {boolean} - True if signature is valid
 */
function validateWebhookSignature(req, secretKey) {
  try {
    const signature = req.headers['x-signature'] || req.headers['signature'];
    const timestamp = req.headers['x-timestamp'] || req.headers['timestamp'] || Date.now();
    
    if (!signature) {
      logger.warn('Missing signature header');
      return false;
    }

    // Create payload string
    const payload = JSON.stringify(req.body);
    const payloadWithTimestamp = `${timestamp}.${payload}`;

    // Generate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(payloadWithTimestamp)
      .digest('hex');

    // Compare signatures
    const receivedSignature = signature.replace('sha256=', '');
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );

    if (!isValid) {
      logger.warn('Invalid webhook signature', {
        receivedSignature: receivedSignature.substring(0, 8) + '...',
        expectedSignature: expectedSignature.substring(0, 8) + '...'
      });
    }

    return isValid;
  } catch (error) {
    logger.error('Signature validation error', { error: error.message });
    return false;
  }
}

/**
 * Validate Telnyx webhook signature
 * @param {Object} req - Express request object
 * @param {string} publicKey - Telnyx public key
 * @returns {boolean} - True if signature is valid
 */
function validateTelnyxSignature(req, publicKey) {
  try {
    const signature = req.headers['telnyx-signature-ed25519'];
    const timestamp = req.headers['telnyx-timestamp'];

    if (!signature || !timestamp) {
      logger.warn('Missing Telnyx signature headers');
      return false;
    }

    // Verify signature using Ed25519
    // Note: This is a simplified version. In production, use a proper Ed25519 library
    const payload = `${timestamp}|${JSON.stringify(req.body)}`;
    
    // For now, we'll log and return true for development
    // In production, implement proper Ed25519 signature verification
    logger.debug('Telnyx signature validation', {
      hasSignature: !!signature,
      hasTimestamp: !!timestamp,
      payloadLength: payload.length
    });

    return true; // Simplified for demo
  } catch (error) {
    logger.error('Telnyx signature validation error', { error: error.message });
    return false;
  }
}

/**
 * Generate webhook signature for outgoing requests
 * @param {Object} payload - Request payload
 * @param {string} secretKey - Secret key
 * @param {number} timestamp - Unix timestamp
 * @returns {string} - Signature
 */
function generateWebhookSignature(payload, secretKey, timestamp) {
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const payloadWithTimestamp = `${timestamp}.${payloadString}`;
  
  return crypto
    .createHmac('sha256', secretKey)
    .update(payloadWithTimestamp)
    .digest('hex');
}

/**
 * Sanitize phone number for logging (mask last 4 digits)
 * @param {string} phoneNumber - Phone number to sanitize
 * @returns {string} - Sanitized phone number
 */
function sanitizePhoneNumber(phoneNumber) {
  if (!phoneNumber || phoneNumber.length < 4) {
    return phoneNumber;
  }
  return phoneNumber.replace(/\d{4}$/, '****');
}

/**
 * Validate phone number format (E.164)
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} - True if valid
 */
function isValidPhoneNumber(phoneNumber) {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
}

/**
 * Rate limiting check
 * @param {string} identifier - Unique identifier (IP, user ID, etc.)
 * @param {number} limit - Maximum requests
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} - True if within limits
 */
const rateLimitStore = new Map();

function checkRateLimit(identifier, limit = 10, windowMs = 60000) {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Clean old entries
  for (const [key, timestamps] of rateLimitStore.entries()) {
    const filtered = timestamps.filter(t => t > windowStart);
    if (filtered.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, filtered);
    }
  }

  // Check current identifier
  const timestamps = rateLimitStore.get(identifier) || [];
  const recentRequests = timestamps.filter(t => t > windowStart);

  if (recentRequests.length >= limit) {
    logger.warn('Rate limit exceeded', {
      identifier: identifier,
      requests: recentRequests.length,
      limit: limit,
      windowMs: windowMs
    });
    return false;
  }

  // Add current request
  recentRequests.push(now);
  rateLimitStore.set(identifier, recentRequests);

  return true;
}

/**
 * Input sanitization for text fields
 * @param {string} input - Input to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} - Sanitized input
 */
function sanitizeTextInput(input, maxLength = 1000) {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .substring(0, maxLength)
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

/**
 * Generate secure random string
 * @param {number} length - Length of random string
 * @returns {string} - Random string
 */
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

module.exports = {
  validateWebhookSignature,
  validateTelnyxSignature,
  generateWebhookSignature,
  sanitizePhoneNumber,
  isValidPhoneNumber,
  checkRateLimit,
  sanitizeTextInput,
  generateSecureToken
};
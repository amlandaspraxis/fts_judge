import rateLimit from 'express-rate-limit';
import { extractClientIp } from '../utils/ipUtils.js';

// Key generator for login/registration attempts: prioritize account identifier or device ID
const getAuthKey = (req) => {
  const identifier = 
    req.body?.regNo || 
    req.body?.registrationNumber || 
    req.body?.email || 
    req.body?.phone || 
    req.headers['x-device-id'];
    
  if (identifier && typeof identifier === 'string') {
    return `auth_${identifier.trim().toLowerCase()}`;
  }
  return `auth_ip_${extractClientIp(req)}`;
};

// Key generator for general API traffic: prioritize user ID or device ID
const getClientKey = (req) => {
  if (req.user?.id) return `user_${req.user.id}`;
  const deviceId = req.headers['x-device-id'] || req.headers['x-device-fingerprint'];
  if (deviceId && typeof deviceId === 'string') {
    return `dev_${deviceId.trim()}`;
  }
  return `ip_${extractClientIp(req)}`;
};

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per window per account/device
  keyGenerator: getAuthKey,
  validate: { xForwardedForHeader: false, default: false },
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 600, // 600 requests per minute per user/device (~10 req/sec burst)
  keyGenerator: getClientKey,
  validate: { xForwardedForHeader: false, default: false },
  skip: (req) => {
    // SSE streams and health check endpoints must never be throttled
    const path = req.originalUrl || req.url || '';
    return path.includes('/api/live/stream') || path.includes('/api/health');
  },
  message: {
    success: false,
    message: 'Too many requests, please slow down.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});


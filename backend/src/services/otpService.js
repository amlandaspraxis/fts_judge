import crypto from 'crypto';
import { ENV } from '../config/environment.js';

/**
 * In-Memory OTP Store with Expiration & Single-Use Enforcement
 * Supports secure ephemeral storage for audience authentication.
 */
class OtpService {
  constructor() {
    // Map: identifier -> { code, expiresAt, used }
    this.otpStore = new Map();
    this.OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes validity
  }

  _normalizeKey(identifier) {
    return String(identifier || '').trim().toLowerCase();
  }

  /**
   * Create and record an OTP for a given user identifier (email or registration number)
   */
  createOtp(identifier) {
    const key = this._normalizeKey(identifier);
    if (!key) return null;

    const isProduction = ENV.NODE_ENV === 'production';
    let code;

    if (!isProduction && process.env.MOCK_OTP) {
      code = String(process.env.MOCK_OTP).trim();
    } else {
      code = crypto.randomInt(100000, 1000000).toString();
    }

    const expiresAt = Date.now() + this.OTP_TTL_MS;

    this.otpStore.set(key, {
      code,
      expiresAt,
      used: false,
      createdAt: Date.now()
    });

    // Clean up expired OTPs periodically
    this._cleanup();

    return {
      expiresAt,
      // Only expose the code in non-production for dev test scripts if explicitly required internally
      code: !isProduction ? code : undefined
    };
  }

  /**
   * Verify an incoming OTP against recorded entry
   */
  verifyOtp(identifier, submittedOtp) {
    if (!submittedOtp || !String(submittedOtp).trim()) {
      return { valid: false, status: 401, code: 'MISSING_OTP', message: 'OTP is required.' };
    }

    const cleanOtp = String(submittedOtp).trim();
    const key = this._normalizeKey(identifier);
    const isProduction = ENV.NODE_ENV === 'production';

    const record = this.otpStore.get(key);

    // In production, mock OTPs must be strictly rejected
    if (isProduction && (cleanOtp === '123456' || cleanOtp === process.env.MOCK_OTP)) {
      if (!record || record.code !== cleanOtp) {
        return { valid: false, status: 401, code: 'INVALID_OTP', message: 'Invalid OTP.' };
      }
    }

    if (!record) {
      // If in dev mode with mock OTP and no send-otp was invoked first:
      if (!isProduction && process.env.MOCK_OTP && cleanOtp === process.env.MOCK_OTP) {
        // Record and consume immediately
        this.otpStore.set(key, { code: cleanOtp, expiresAt: Date.now() + this.OTP_TTL_MS, used: true });
        return { valid: true };
      }
      return { valid: false, status: 401, code: 'INVALID_OTP', message: 'No active OTP found. Please request an OTP first.' };
    }

    // Check if already used
    if (record.used) {
      return { valid: false, status: 401, code: 'OTP_ALREADY_USED', message: 'OTP has already been used. Please request a new one.' };
    }

    // Check expiration
    if (Date.now() > record.expiresAt) {
      this.otpStore.delete(key);
      return { valid: false, status: 401, code: 'EXPIRED_OTP', message: 'OTP has expired. Please request a new one.' };
    }

    // Check OTP value
    if (record.code !== cleanOtp) {
      return { valid: false, status: 401, code: 'INVALID_OTP', message: 'Incorrect OTP entered.' };
    }

    // Consume OTP (single use)
    record.used = true;
    return { valid: true };
  }

  /**
   * Remove expired OTPs to prevent memory accumulation
   */
  _cleanup() {
    const now = Date.now();
    for (const [key, record] of this.otpStore.entries()) {
      if (now > record.expiresAt + 60000) {
        this.otpStore.delete(key);
      }
    }
  }

  /**
   * Reset store (useful for automated testing)
   */
  clear() {
    this.otpStore.clear();
  }
}

export const otpService = new OtpService();
export default otpService;

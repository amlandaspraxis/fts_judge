import express from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/environment.js';
import { liveEventService } from '../services/liveEventService.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { loginLimiter } from '../middleware/rateLimitMiddleware.js';
import { otpService } from '../services/otpService.js';

const router = express.Router();

// Get Authoritative Sanitized Public Event State (Never leaks PIN, judge codes, or private credentials)
router.get('/state', (req, res) => {
  res.json({
    success: true,
    state: liveEventService.getPublicState()
  });
});

// Admin-only Authoritative Event State
router.get('/admin-state', authMiddleware, requireRole('ADMIN'), (req, res) => {
  res.json({
    success: true,
    state: liveEventService.getState()
  });
});

// Real-Time Server-Sent Events (SSE) Stream
router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  try {
    req.socket?.setNoDelay?.(true);
    req.socket?.setKeepAlive?.(true, 15000);
  } catch {}
  res.flushHeaders?.();

  liveEventService.addClient(res);
});

// Dispatch Authoritative Action (Strictly Admin-Only)
router.post('/action', authMiddleware, requireRole('ADMIN'), (req, res) => {
  const { action, payload } = req.body;
  if (!action) {
    return res.status(400).json({ success: false, message: 'Action type is required' });
  }

  try {
    const updatedState = liveEventService.dispatch(action, payload || {});
    res.json({ success: true, state: updatedState });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Server-side Event PIN Verification (Rate-limited)
router.post('/verify-pin', loginLimiter, (req, res) => {
  const { pin } = req.body;
  const state = liveEventService.getState();
  if (pin && pin.trim() === state.event.pin) {
    res.json({ success: true, message: 'Event PIN verified' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid Event PIN' });
  }
});

// Server-side OTP Generation / Send via Email (Rate-limited, never exposes OTP)
router.post('/send-otp', loginLimiter, (req, res) => {
  const { studentId, regNo, phone, email } = req.body;
  const id = (regNo || studentId || '').trim();
  const cleanPhone = (phone || '').trim();
  const cleanEmail = (email || '').trim();

  if (!id) {
    return res.status(400).json({ success: false, message: 'Registration Number is required.' });
  }
  if (!cleanPhone || cleanPhone.length < 10) {
    return res.status(400).json({ success: false, message: 'A valid 10-digit phone number is required.' });
  }
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return res.status(400).json({ success: false, message: 'A valid email address is required to receive OTP.' });
  }

  // Generate OTP in secure store without exposing in response or logging digits
  otpService.createOtp(cleanEmail);
  otpService.createOtp(id);

  console.log(`[AUTH/OTP] Dispatched OTP to ${cleanEmail} for RegNo: ${id}`);

  res.json({
    success: true,
    message: `OTP sent successfully to ${cleanEmail}.`,
    email: cleanEmail,
    regNo: id,
    phone: cleanPhone
  });
});

// Direct Audience Login (Rate-limited, validates 8-digit regNo, 10-digit phone, and 3 allowed domains)
router.post('/audience-login', loginLimiter, (req, res) => {
  const { regNo, studentId, email, phone } = req.body || {};
  const cleanReg = String(regNo || studentId || '').trim().toUpperCase();
  const cleanPhone = String(phone || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();

  const regNoRegex = /^12[0-6]\d{5}$/;
  if (!cleanReg || !regNoRegex.test(cleanReg)) {
    return res.status(400).json({
      success: false,
      message: 'Registration number must be exactly 8 digits and start between 120 and 126 (e.g. 12440078).'
    });
  }

  const phoneRegex = /^\d{10}$/;
  if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
    return res.status(400).json({
      success: false,
      message: 'Phone number must be exactly 10 digits.'
    });
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|lpu\.in|outlook\.com)$/i;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    return res.status(400).json({
      success: false,
      message: 'Email must belong to one of the 3 allowed domains: @gmail.com, @lpu.in, or @outlook.com.'
    });
  }

  const session = {
    regNo: cleanReg,
    email: cleanEmail,
    phone: cleanPhone,
    verifiedAt: new Date().toISOString()
  };

  const user = liveEventService.registerAudienceUser(session);
  const userId = user?.id || `usr_${cleanReg || Date.now()}`;
  const token = jwt.sign(
    { userId, role: 'AUDIENCE', name: user?.name || `Student (${cleanReg})`, deviceSession: Date.now() },
    ENV.JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({
    success: true,
    message: 'Audience login successful.',
    session,
    token,
    data: {
      token,
      user: {
        id: userId,
        name: user?.name || `Student (${cleanReg})`,
        email: cleanEmail,
        studentId: cleanReg,
        role: 'AUDIENCE',
        status: 'ACTIVE'
      }
    },
    user: {
      id: userId,
      name: user?.name || `Student (${cleanReg})`,
      email: cleanEmail,
      studentId: cleanReg,
      role: 'AUDIENCE',
      status: 'ACTIVE'
    }
  });
});

// Server-side OTP Verification (Rate-limited, single-use, non-mock in production)
router.post('/verify-otp', loginLimiter, (req, res) => {
  const { otp, regNo, studentId, email, phone } = req.body;
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanReg = (regNo || studentId || '').trim().toUpperCase();

  const identifier = cleanEmail || cleanReg;
  const result = otpService.verifyOtp(identifier, otp);

  if (result.valid) {
    const session = {
      regNo: (cleanReg || 'AUDIENCE').trim().toUpperCase(),
      email: cleanEmail,
      phone: (phone || '').trim(),
      verifiedAt: new Date().toISOString()
    };
    // Synchronize into db.users and broadcast AUDIENCE_UPDATE to Admin portal
    const user = liveEventService.registerAudienceUser(session);
    const userId = user?.id || `usr_${cleanReg || Date.now()}`;
    const token = jwt.sign(
      { userId, role: 'AUDIENCE', name: user?.name || `Student (${cleanReg || cleanEmail})`, deviceSession: Date.now() },
      ENV.JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      success: true,
      message: 'OTP verified successfully.',
      session,
      token,
      data: {
        token,
        user: {
          id: userId,
          name: user?.name || `Student (${cleanReg || cleanEmail})`,
          email: cleanEmail,
          studentId: cleanReg,
          role: 'AUDIENCE',
          status: 'ACTIVE'
        }
      },
      user: {
        id: userId,
        name: user?.name || `Student (${cleanReg || cleanEmail})`,
        email: cleanEmail,
        studentId: cleanReg,
        role: 'AUDIENCE',
        status: 'ACTIVE'
      }
    });
  } else {
    res.status(result.status || 401).json({
      success: false,
      message: result.message || 'Incorrect OTP. Please check your email and try again.',
      code: result.code || 'INVALID_OTP'
    });
  }
});

// Server-side Judge Code Verification (Rate-limited)
router.post('/judge-login', loginLimiter, (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, message: 'Judge access code is required.' });
  }
  const cleanCode = code.trim().toLowerCase();
  const state = liveEventService.getState();
  const judge = state.judges.find(j => 
    (j.code && j.code.toLowerCase() === cleanCode) ||
    (j.accessCode && j.accessCode.toLowerCase() === cleanCode)
  );
  if (judge) {
    res.json({
      success: true,
      judge: { 
        id: judge.id, 
        name: judge.name, 
        photo: judge.photo,
        assignedCategories: judge.assignedCategories || []
      }
    });
  } else {
    res.status(401).json({ success: false, message: 'Invalid judge access code.' });
  }
});

export default router;

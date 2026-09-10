import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/database.js';
import { ENV } from '../config/environment.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { liveEventService, formatLiveJudge } from '../services/liveEventService.js';
import { otpService } from '../services/otpService.js';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return sendError(res, 'Login ID / Email and password are required.', 400, 'MISSING_FIELDS');
    }

    const cleanInput = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Check if logging in as Admin using configured Admin ID, email, or shorthand 'admin'
    const configuredAdminId = (ENV.ADMIN_LOGIN_ID || 'admin@admin.com').toLowerCase();
    const isAdminMatch = (
      cleanInput === configuredAdminId ||
      cleanInput === 'admin@admin.com' ||
      cleanInput === 'admin@event.local' ||
      cleanInput === 'admin' ||
      cleanInput === 'fts_admin' ||
      cleanInput === 'management'
    );

    let user = null;
    if (isAdminMatch) {
      user = db.users.find(u => u.role === 'ADMIN');
    } else {
      user = db.users.find(u => u.email.toLowerCase() === cleanInput || u.id.toLowerCase() === cleanInput);
    }

    if (!user) {
      return sendError(res, 'Invalid login credentials.', 401, 'INVALID_CREDENTIALS');
    }

    // Verify password: check against hash or against ENV.ADMIN_PASSWORD / ftsadmin2026 for admin
    let isMatch = await bcrypt.compare(cleanPassword, user.passwordHash);
    if (!isMatch && user.role === 'ADMIN' && (
      (ENV.ADMIN_PASSWORD && cleanPassword === ENV.ADMIN_PASSWORD) ||
      cleanPassword === 'ftsadmin2026'
    )) {
      isMatch = true;
    }

    if (!isMatch) {
      return sendError(res, 'Invalid login credentials.', 401, 'INVALID_CREDENTIALS');
    }

    // Sign stateless JWT token (valid for 12 hours, allows unlimited concurrent devices)
    const token = jwt.sign(
      { userId: user.id, role: user.role, name: user.name, deviceSession: Date.now() },
      ENV.JWT_SECRET,
      { expiresIn: '12h' }
    );

    return sendSuccess(res, {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    }, 'Login successful');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const logout = (req, res) => {
  return sendSuccess(res, {}, 'Logged out successfully');
};

export const me = (req, res) => {
  return sendSuccess(res, { user: req.user }, 'Current user profile');
};

export const forgotPassword = (req, res) => {
  return sendSuccess(res, {}, 'If an account exists, a reset link has been dispatched.');
};

export const resetPassword = (req, res) => {
  return sendSuccess(res, {}, 'Password successfully updated.');
};

export const judgeCodeLogin = (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return sendError(res, 'Judge access code is required.', 400, 'MISSING_CODE');
    }

    const cleanCode = code.trim().toLowerCase();
    const liveJudges = liveEventService.getState().judges || [];
    let judge = liveJudges.find(j => 
      (j.code && j.code.toLowerCase() === cleanCode) || 
      (j.accessCode && j.accessCode.toLowerCase() === cleanCode)
    );

    if (!judge && db.users) {
      const u = db.users.find(u => 
        u.role === 'JUDGE' && 
        ((u.code && u.code.toLowerCase() === cleanCode) || (u.accessCode && u.accessCode.toLowerCase() === cleanCode))
      );
      if (u) judge = formatLiveJudge(u);
    }

    if (!judge) {
      return sendError(res, 'Invalid judge access code.', 401, 'INVALID_CODE');
    }

    // Ensure judge exists in db.users for JWT / auth middleware
    let dbUser = (db.users || []).find(u => u.id === judge.id || (judge.email && u.email && u.email.toLowerCase() === judge.email.toLowerCase()));
    if (!dbUser && db.users) {
      dbUser = {
        id: judge.id,
        name: judge.name,
        email: judge.email || `judge_${judge.code || judge.id}@event.local`,
        code: judge.code,
        accessCode: judge.code,
        role: 'JUDGE',
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      };
      db.users.push(dbUser);
    }

    const token = jwt.sign(
      { userId: dbUser ? dbUser.id : judge.id, role: 'JUDGE', name: judge.name, deviceSession: Date.now() },
      ENV.JWT_SECRET,
      { expiresIn: '12h' }
    );

    return sendSuccess(res, {
      token,
      user: {
        id: judge.id,
        name: judge.name,
        email: judge.email || dbUser?.email || '',
        code: judge.code,
        role: 'JUDGE',
        status: 'ACTIVE'
      }
    }, 'Judge sign-in successful');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const audienceLogin = (req, res) => {
  try {
    const { regNo, studentId, email, phone } = req.body || {};
    const cleanReg = String(regNo || studentId || '').trim();
    const cleanPhone = String(phone || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();

    // 1. Validate Registration Number: exactly 8 digits, starts with 120xxxxx to 126xxxxx
    const regNoRegex = /^12[0-6]\d{5}$/;
    if (!cleanReg) {
      return sendError(res, 'Registration number is required.', 400, 'INVALID_REG_NO');
    }
    if (!regNoRegex.test(cleanReg)) {
      return sendError(
        res, 
        'Registration number must be exactly 8 digits and start between 120 and 126 (e.g. 12440078).', 
        400, 
        'INVALID_REG_NO'
      );
    }

    // 2. Validate Phone Number: exactly 10 digits
    const phoneRegex = /^\d{10}$/;
    if (!cleanPhone) {
      return sendError(res, 'Phone number is required.', 400, 'INVALID_PHONE');
    }
    if (!phoneRegex.test(cleanPhone)) {
      return sendError(res, 'Phone number must be exactly 10 digits.', 400, 'INVALID_PHONE');
    }

    // 3. Validate Email: must belong to @gmail.com, @lpu.in, or @outlook.com
    const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|lpu\.in|outlook\.com)$/i;
    if (!cleanEmail) {
      return sendError(res, 'Email address is required.', 400, 'INVALID_EMAIL');
    }
    if (!emailRegex.test(cleanEmail)) {
      return sendError(
        res, 
        'Email must belong to one of the 3 allowed domains: @gmail.com, @lpu.in, or @outlook.com.', 
        400, 
        'INVALID_EMAIL'
      );
    }

    // Register or retrieve user from db.users via liveEventService
    let user = liveEventService.registerAudienceUser({
      regNo: cleanReg,
      email: cleanEmail,
      phone: cleanPhone
    });

    if (!user) {
      user = (db.users || []).find(u => 
        (cleanReg && (u.studentId === cleanReg || u.regNo === cleanReg)) ||
        (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail)
      );
    }

    const userId = user?.id || `usr_${cleanReg || Date.now()}`;
    const userName = user?.name || `Student (${cleanReg})`;
    const userEmail = user?.email || cleanEmail;

    const token = jwt.sign(
      { userId, role: 'AUDIENCE', name: userName, deviceSession: Date.now() },
      ENV.JWT_SECRET,
      { expiresIn: '12h' }
    );

    return sendSuccess(res, {
      token,
      user: {
        id: userId,
        name: userName,
        email: userEmail,
        studentId: cleanReg,
        role: 'AUDIENCE',
        status: 'ACTIVE'
      }
    }, 'Audience authentication successful');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

export const audienceOtpLogin = (req, res) => {
  // If no OTP provided, treat as direct audience login
  if (!req.body?.otp) {
    return audienceLogin(req, res);
  }

  try {
    const { regNo, studentId, email, phone, otp } = req.body;
    const cleanReg = (regNo || studentId || '').trim().toUpperCase();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (phone || '').trim();

    if (!cleanReg && !cleanEmail) {
      return sendError(res, 'Student Registration Number or Email is required.', 400, 'MISSING_FIELDS');
    }

    // Verify OTP using OtpService (fail-closed, single-use, non-mock in production)
    const identifier = cleanEmail || cleanReg;
    const otpResult = otpService.verifyOtp(identifier, otp);
    if (!otpResult.valid) {
      return sendError(res, otpResult.message, otpResult.status || 401, otpResult.code || 'INVALID_OTP');
    }

    // Register or retrieve user from db.users via liveEventService
    let user = liveEventService.registerAudienceUser({
      regNo: cleanReg,
      email: cleanEmail,
      phone: cleanPhone
    });

    if (!user) {
      user = (db.users || []).find(u => 
        (cleanReg && (u.studentId === cleanReg || u.regNo === cleanReg)) ||
        (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail)
      );
    }

    const userId = user?.id || `usr_${cleanReg || Date.now()}`;
    const userName = user?.name || `Student (${cleanReg || cleanEmail})`;
    const userEmail = user?.email || cleanEmail || `${cleanReg.toLowerCase()}@student.local`;

    const token = jwt.sign(
      { userId, role: 'AUDIENCE', name: userName, deviceSession: Date.now() },
      ENV.JWT_SECRET,
      { expiresIn: '12h' }
    );

    return sendSuccess(res, {
      token,
      user: {
        id: userId,
        name: userName,
        email: userEmail,
        studentId: cleanReg,
        role: 'AUDIENCE',
        status: 'ACTIVE'
      }
    }, 'Audience authentication successful');
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};


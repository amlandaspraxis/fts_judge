import jwt from 'jsonwebtoken';
import { ENV } from '../config/environment.js';
import dbService from '../config/dbService.js';
import { sendError } from '../utils/response.js';

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'Authentication required. Missing token.', 401, 'UNAUTHORIZED');
  }

  const token = authHeader.split(' ')[1];
  try {
    // 1. Direct support for standalone/client audience tokens (e.g. fts_aud_12440078_... or fts_aud_token_...)
    if (token.startsWith('fts_aud_') || token.startsWith('fts_aud_token_')) {
      const parts = token.split('_');
      const regNo = parts.find(p => /^12[0-6]\d{5}$/.test(p)) || '12440078';
      req.user = {
        id: `usr_${regNo}`,
        name: `Student (${regNo})`,
        studentId: regNo,
        regNo: regNo,
        email: `${regNo.toLowerCase()}@student.local`,
        role: 'AUDIENCE',
        status: 'ACTIVE'
      };
      return next();
    }

    const decoded = jwt.verify(token, ENV.JWT_SECRET);

    // 2. Audience JWT token support - audience are ephemeral attendees, no static table lookup needed
    if (decoded.role === 'AUDIENCE') {
      const regMatch = String(decoded.userId || '').match(/\d{8}/);
      const regNo = decoded.studentId || decoded.regNo || (regMatch ? regMatch[0] : '12440078');
      req.user = {
        id: decoded.userId || `usr_${regNo}`,
        name: decoded.name || `Student (${regNo})`,
        studentId: regNo,
        regNo: regNo,
        email: decoded.email || `${regNo.toLowerCase()}@student.local`,
        role: 'AUDIENCE',
        status: 'ACTIVE'
      };
      return next();
    }

    // 3. System users (Admin, Judge, Desk) - lookup in database with memoryDb fallback
    let user = await dbService.findUserById(decoded.userId);
    if (!user && dbService.memoryDb?.users) {
      user = dbService.memoryDb.users.find(u => u.id === decoded.userId);
    }

    if (!user) {
      return sendError(res, 'User not found or session invalid.', 401, 'USER_NOT_FOUND');
    }
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    };
    next();
  } catch (err) {
    return sendError(res, 'Invalid or expired token.', 401, 'INVALID_TOKEN');
  }
};

/**
 * Optional Auth Middleware
 * Populates req.user if valid token present, otherwise proceeds with req.user = null
 */
export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    if (token.startsWith('fts_aud_') || token.startsWith('fts_aud_token_')) {
      const parts = token.split('_');
      const regNo = parts.find(p => /^12[0-6]\d{5}$/.test(p)) || '12440078';
      req.user = {
        id: `usr_${regNo}`,
        name: `Student (${regNo})`,
        studentId: regNo,
        regNo: regNo,
        email: `${regNo.toLowerCase()}@student.local`,
        role: 'AUDIENCE',
        status: 'ACTIVE'
      };
      return next();
    }

    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    if (decoded.role === 'AUDIENCE') {
      const regMatch = String(decoded.userId || '').match(/\d{8}/);
      const regNo = decoded.studentId || decoded.regNo || (regMatch ? regMatch[0] : '12440078');
      req.user = {
        id: decoded.userId || `usr_${regNo}`,
        name: decoded.name || `Student (${regNo})`,
        studentId: regNo,
        regNo: regNo,
        email: decoded.email || `${regNo.toLowerCase()}@student.local`,
        role: 'AUDIENCE',
        status: 'ACTIVE'
      };
      return next();
    }

    let user = await dbService.findUserById(decoded.userId);
    if (!user && dbService.memoryDb?.users) {
      user = dbService.memoryDb.users.find(u => u.id === decoded.userId);
    }
    if (user) {
      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      };
    } else {
      req.user = null;
    }
  } catch {
    req.user = null;
  }
  next();
};

export default authMiddleware;

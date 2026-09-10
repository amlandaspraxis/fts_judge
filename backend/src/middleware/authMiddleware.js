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
    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    const user = await dbService.findUserById(decoded.userId);
    if (!user) {
      return sendError(res, 'User not found or session invalid.', 401, 'USER_NOT_FOUND');
    }
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
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
    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    const user = await dbService.findUserById(decoded.userId);
    if (user) {
      req.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
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

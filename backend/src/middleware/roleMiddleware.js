import { sendError } from '../utils/response.js';

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Authentication required.', 401, 'UNAUTHORIZED');
    }
    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied. Requires one of roles: [${allowedRoles.join(', ')}].`,
        403,
        'FORBIDDEN'
      );
    }
    next();
  };
};

export default requireRole;

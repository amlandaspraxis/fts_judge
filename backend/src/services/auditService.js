import dbService from '../config/dbService.js';
import { logger } from '../utils/logger.js';

export const logAudit = async (userId, action, entityType, entityId, oldValue = null, newValue = null, req = null) => {
  const auditData = {
    userId,
    action,
    entityType,
    entityId,
    oldValue: oldValue ? (typeof oldValue === 'string' ? oldValue : JSON.stringify(oldValue)) : null,
    newValue: newValue ? (typeof newValue === 'string' ? newValue : JSON.stringify(newValue)) : null,
    ipAddress: req?.ip || req?.connection?.remoteAddress || '127.0.0.1',
    userAgent: req?.headers?.['user-agent'] || 'System'
  };

  const auditEntry = await dbService.createAuditLog(auditData);
  logger.info(`[Audit] ${action} on ${entityType}:${entityId} by User:${userId}`);
  return auditEntry;
};

export const getAuditLogs = async (limit = 100) => {
  return await dbService.getAuditLogs(limit);
};

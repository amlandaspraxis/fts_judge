/**
 * Utility for extracting and normalizing client IP address
 */
export function extractClientIp(req) {
  if (!req) return '127.0.0.1';

  let rawIp = '';
  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded && typeof forwarded === 'string') {
    rawIp = forwarded.split(',')[0].trim();
  } else if (req.headers?.['x-real-ip']) {
    rawIp = String(req.headers['x-real-ip']).trim();
  } else if (req.ip) {
    rawIp = req.ip;
  } else if (req.socket?.remoteAddress) {
    rawIp = req.socket.remoteAddress;
  } else if (req.connection?.remoteAddress) {
    rawIp = req.connection.remoteAddress;
  }

  if (!rawIp) {
    return '127.0.0.1';
  }

  // Normalize IPv6-mapped IPv4 addresses (e.g. ::ffff:192.168.1.1)
  if (rawIp.startsWith('::ffff:')) {
    rawIp = rawIp.replace('::ffff:', '');
  }

  // Normalize IPv6 loopback
  if (rawIp === '::1') {
    rawIp = '127.0.0.1';
  }

  return rawIp;
}

export default { extractClientIp };

/**
 * Security HTTP Headers Middleware
 * Enhances application security against clickjacking, MIME-sniffing, XSS, unauthorized framing,
 * and restricts browser features / content origins with CSP and Permissions-Policy.
 */
export const securityHeaders = (req, res, next) => {
  // Prevent MIME-type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Protect against clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // XSS Protection for legacy browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Control referrer information sent in HTTP requests
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Enforce HTTPS transmission in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Content Security Policy (allows React/Vite assets, Google Fonts, Unsplash photos, and local dev server)
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https://images.unsplash.com",
    "media-src 'self' data: blob:",
    "connect-src 'self' http://localhost:* ws://localhost:* http://127.0.0.1:* ws://127.0.0.1:*",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');

  res.setHeader('Content-Security-Policy', cspDirectives);

  // Permissions Policy (allow camera for self QR scanning if needed; restrict microphone and geolocation)
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=()');

  // Remove fingerprinting headers
  res.removeHeader('X-Powered-By');

  next();
};

export default securityHeaders;

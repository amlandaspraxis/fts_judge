import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { ENV } from './config/environment.js';
import { logger } from './utils/logger.js';
import { apiLimiter } from './middleware/rateLimitMiddleware.js';
import { securityHeaders } from './middleware/securityHeaders.js';

import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import judgeRoutes from './routes/judgeRoutes.js';
import audienceRoutes from './routes/audienceRoutes.js';
import participantRoutes from './routes/participantRoutes.js';
import resultRoutes from './routes/resultRoutes.js';
import liveEventRoutes from './routes/liveEventRoutes.js';
import eventsRoutes from './routes/events.js';
import judgesRoutes from './routes/judges.js';
import votesRoutes from './routes/votes.js';

const app = express();

// Security & Parsing Middleware
app.use(securityHeaders);

// Gzip / Brotli compression for static payloads & JSON responses (bypasses SSE)
app.use(compression({
  threshold: 0,
  filter: (req, res) => {
    if (req.headers.accept && req.headers.accept.includes('text/event-stream')) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Strict CORS Origin Allowlist (Prevents arbitrary Origin reflection with credentials)
const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5001',
  'http://127.0.0.1:5001'
]);

if (ENV.CORS_ORIGIN && ENV.CORS_ORIGIN !== '*') {
  ENV.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean).forEach(o => ALLOWED_ORIGINS.add(o));
}
if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(',').map(s => s.trim()).filter(Boolean).forEach(o => ALLOWED_ORIGINS.add(o));
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (like server-to-server or tests without Origin header)
    if (!origin) {
      return callback(null, true);
    }
    if (ALLOWED_ORIGINS.has(origin)) {
      return callback(null, origin);
    }
    // Reject untrusted origin
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-device-id', 'x-device-fingerprint', 'x-forwarded-for']
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use('/api/', apiLimiter);

// Health Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'Voting & Judging System',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes matching Section 16 & 20 of 3969.txt
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/judge', judgeRoutes);
app.use('/api/audience', audienceRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/results', resultRoutes);

// Real-Time Event System (Implementation Guide Multi-Portal OS)
app.use('/api/live', liveEventRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/judges', judgesRoutes);
app.use('/api/votes', votesRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found`, code: 'NOT_FOUND' });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  logger.error(err.message, err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error', code: 'SERVER_ERROR' });
});

const isTestEnv = process.env.NODE_ENV === 'test' || 
  process.env.npm_lifecycle_event === 'test' || 
  process.argv.some(arg => arg.includes('test'));

if (!isTestEnv) {
  const server = app.listen(ENV.PORT, () => {
    logger.info(`Voting & Judging Backend API running on port ${ENV.PORT}`);
  });

  // Optimize socket limits and TCP keep-alive for 4,000+ concurrent attendees
  server.maxConnections = 10000;
  server.keepAliveTimeout = 65000; // 65 seconds
  server.headersTimeout = 66000;   // 66 seconds (> keepAliveTimeout)
}

export default app;

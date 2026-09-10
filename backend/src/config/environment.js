import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// Strict validation of JWT_SECRET to reject hardcoded / compromised fallbacks
const COMPROMISED_SECRETS = new Set([
  'fts_super_secret_jwt_key_2026',
  'CHANGE_ME_IN_DEPLOYMENT',
  'secret',
  'jwt_secret',
  'password'
]);

const jwtSecret = process.env.JWT_SECRET ? process.env.JWT_SECRET.trim() : '';

if (isProduction) {
  if (!jwtSecret || jwtSecret.length < 32 || COMPROMISED_SECRETS.has(jwtSecret)) {
    console.error('[CRITICAL] Insecure or missing JWT_SECRET in production environment. Fail-closed shutdown.');
    throw new Error('FATAL: JWT_SECRET must be explicitly configured with at least 32 characters in production.');
  }
} else {
  // Fail-closed in dev/test: reject missing or compromised fallback
  if (!jwtSecret || COMPROMISED_SECRETS.has(jwtSecret)) {
    throw new Error('FATAL: JWT_SECRET is missing or set to a compromised key. Define a secure JWT_SECRET in backend/.env.');
  }
  if (jwtSecret.length < 32) {
    throw new Error('FATAL: JWT_SECRET must be at least 32 characters in length.');
  }
}

export const ENV = {
  PORT: parseInt(process.env.PORT || '5001', 10),
  NODE_ENV,
  JWT_SECRET: jwtSecret,
  SESSION_SECRET: process.env.SESSION_SECRET || 'fts_session_secret_2026',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '',
  DATABASE_URL: process.env.DATABASE_URL || '',
  ADMIN_LOGIN_ID: process.env.ADMIN_LOGIN_ID || 'admin@admin.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'ftsadmin2026'
};

export default ENV;

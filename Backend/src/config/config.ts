// Backend/src/config/config.ts
import dotenv from 'dotenv';
dotenv.config();

// ─── Fail fast if required env vars are missing ────────────────────────────
const required = ['MONGODB_URI', 'JWT_SECRET', 'GEMINI_API_KEY'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`\n❌  Missing required env variable: ${key}`);
    console.error(`    Copy .env.example → .env and fill in your values.\n`);
    process.exit(1);
  }
}

// SMTP is optional (emails will just log if not configured)
// No need to fail if missing

const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI as string,

  jwt: {
    secret: process.env.JWT_SECRET as string,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY as string,
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
  },

  arcjet: {
    key: process.env.ARCJET_KEY || '',
  },

  // ─── SMTP Email Service (Nodemailer - FREE) ──────────────────────────────
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // false for 587, true for 465
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'VoyageurAI <noreply@voyageurai.com>',
  },

  // ─── Resend (kept for backward compatibility - will be removed later) ───
  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
    from: process.env.RESEND_FROM || 'VoyageurAI <onboarding@resend.dev>',
  },

  adminEmail: (process.env.ADMIN_EMAIL || 'admin@voyageur.pk').toLowerCase(),

  allowedOrigins: (
    process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000'
  )
    .split(',')
    .map((o) => o.trim()),

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  freeTripLimit: parseInt(process.env.FREE_TRIP_LIMIT || '5', 10),
};

export default config;
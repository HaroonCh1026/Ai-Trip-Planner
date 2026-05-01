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
// Stripe is optional for development (will log warning if missing)
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

  // ─── Stripe Payment (NEW - Round 8) ─────────────────────────────────────
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    proPriceId: process.env.STRIPE_PRO_PRICE_ID || '',
    successUrl: process.env.STRIPE_SUCCESS_URL || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success`,
    cancelUrl: process.env.STRIPE_CANCEL_URL || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/cancel`,
  },

  // ─── ML cost-prediction service (Day 1) ─────────────────────────────────
  // The Python Flask service that exposes the trained model. Run separately:
  //     cd ML && python service.py
  // baseUrl is intentionally optional — if the ML service isn't running, the
  // Node backend silently skips ML enrichment and falls back to Gemini-only
  // estimates. This keeps the backend bootable even when Python isn't set up.
  ml: {
    baseUrl: process.env.ML_BASE_URL || 'http://127.0.0.1:5001',
  },

  // ─── Geoapify Routing & Places (Day 3) ───────────────────────────────────
  // Free tier: 3000 credits/day, no credit card required, allowed to cache
  // responses indefinitely. We use Geoapify primarily for inter-city distance
  // & drive-time lookups (routingService.ts) and will use it for verified
  // place data on Day 4.
  //
  // If apiKey is empty, the routing service silently falls back to its
  // curated 30-route matrix + dataset estimates. Backend still boots.
  geoapify: {
    apiKey: process.env.GEOAPIFY_API_KEY || '',
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
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';

import config from './config/config';
import { arcjetGlobal } from './middleware/arcjet.middleware';
import authRoutes from './routes/auth.routes';
import aiRoutes from './routes/ai.routes';
import tripRoutes from './routes/trip.routes';
import bookingRoutes from './routes/booking.routes';
import adminRoutes from './routes/admin.routes';
import supportRoutes from './routes/support.routes';
import blogRoutes from './routes/blog.routes';
import { errorHandler, notFound } from './middleware/error.middleware';

const app = express();

// helmet's default crossOriginResourcePolicy is "same-origin", which blocks
// the Vite dev server (different port) from loading uploaded images. Loosen
// it so /uploads/* is fetchable cross-origin during dev. In production behind
// a single origin / CDN this isn't needed but is still safe.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin && config.nodeEnv === 'development') return callback(null, true);
    if (!origin || config.allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000, max: 200,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
}));

// JSON body parsers — back to a tight 100kb limit since avatars are now
// uploaded as multipart, not embedded base64.
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(arcjetGlobal);

// Serve uploaded files (avatars). Cache for 1 day in dev, 1 year in prod.
// Filenames include a random suffix on each upload, so cache safely.
app.use(
  '/uploads',
  express.static(path.join(process.cwd(), 'uploads'), {
    maxAge: config.nodeEnv === 'production' ? '1y' : '1d',
    immutable: config.nodeEnv === 'production',
  })
);

app.get('/health', (_req, res) => {
  res.json({ success: true, message: '🚀 VoyageurAI API is running', env: config.nodeEnv, timestamp: new Date().toISOString() });
});

app.use('/api/auth',     authRoutes);
app.use('/api/ai',       aiRoutes);
app.use('/api/trips',    tripRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/support',  supportRoutes);
app.use('/api/blogs',    blogRoutes);

app.use(notFound);
app.use(errorHandler);


export default app;
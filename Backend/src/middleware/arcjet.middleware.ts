import arcjet, { tokenBucket, shield, detectBot } from '@arcjet/node';
import { Request, Response, NextFunction } from 'express';
import config from '../config/config';
import { sendError } from '../utils/response';

// ─── Environment Check ─────────────────────────────────────────────────────
const isDev = config.nodeEnv === 'development';

// ─── Only initialise Arcjet when a key is configured ──────────────────────
const hasKey =
  !!config.arcjet.key && !config.arcjet.key.startsWith('ajkey_your');

// ─── Main app-level Arcjet instance ───────────────────────────────────────
// Shield: blocks attacks (SQLi, XSS, etc.)
// DetectBot: blocks bots (disabled in dev / DRY_RUN)
const appArcjet = hasKey
  ? arcjet({
      key: config.arcjet.key,
      rules: [
        // Shield in DRY_RUN for dev, LIVE for production
        shield({
          mode: isDev ? 'DRY_RUN' : 'LIVE',
        }),

        // DetectBot relaxed in dev so Postman works
        detectBot({
          mode: isDev ? 'DRY_RUN' : 'LIVE',
          allow: [
            'CATEGORY:SEARCH_ENGINE',
            'CATEGORY:MONITOR',
            'CATEGORY:DEVELOPER_TOOL', // ✅ allows Postman/dev tools
          ],
        }),
      ],
    })
  : null;

// ─── Stricter instance for AI generation endpoint ─────────────────────────
const aiArcjet = hasKey
  ? arcjet({
      key: config.arcjet.key,
      rules: [
        shield({
          mode: isDev ? 'DRY_RUN' : 'LIVE',
        }),
        tokenBucket({
          mode: isDev ? 'DRY_RUN' : 'LIVE',
          refillRate: 1,
          interval: 60,
          capacity: 5,
        }),
      ],
    })
  : null;

// ─── Auth rate limit instance ─────────────────────────────────────────────
const authArcjet = hasKey
  ? arcjet({
      key: config.arcjet.key,
      rules: [
        shield({
          mode: isDev ? 'DRY_RUN' : 'LIVE',
        }),
        tokenBucket({
          mode: isDev ? 'DRY_RUN' : 'LIVE',
          refillRate: 5,
          interval: 60,
          capacity: 20,
        }),
      ],
    })
  : null;

// ─── Helper: extract fingerprint from request ─────────────────────────────
const getFingerprint = (req: Request): string =>
  (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
  req.socket.remoteAddress ||
  'unknown';

// ─── Middleware factory ────────────────────────────────────────────────────
function makeArcjetMiddleware(
  instance: ReturnType<typeof arcjet> | null,
  label: string
) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Skip if Arcjet not configured
    if (!instance) {
      if (isDev) {
        console.log(`[Arcjet ${label}] No key configured — skipping`);
      }
      return next();
    }

    try {
      const decision = await instance.protect(req, {
        fingerprint: getFingerprint(req),
      });

      if (decision.isDenied()) {
        const reason = decision.reason;

        if (reason.isRateLimit()) {
          sendError(
            res,
            'Too many requests. Please slow down and try again.',
            429
          );
          return;
        }

        if (reason.isBot()) {
          sendError(
            res,
            isDev
              ? 'Bot detected (dev mode - not blocked).'
              : 'Automated requests are not permitted.',
            403
          );
          return;
        }

        if (reason.isShield()) {
          sendError(
            res,
            'Request blocked for security reasons.',
            403
          );
          return;
        }

        sendError(res, 'Request denied.', 403);
        return;
      }

      next();
    } catch (err) {
      // Never block request if Arcjet fails
      console.error(`[Arcjet ${label}] Error:`, (err as Error).message);
      next();
    }
  };
}

// ─── Exported middleware ───────────────────────────────────────────────────
export const arcjetGlobal = makeArcjetMiddleware(appArcjet, 'global');
export const arcjetAI = makeArcjetMiddleware(aiArcjet, 'AI');
export const arcjetAuth = makeArcjetMiddleware(authArcjet, 'auth');
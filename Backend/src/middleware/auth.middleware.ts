import { Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { sendError } from '../utils/response';
import { AuthRequest } from '../types';

// ─── Verify Bearer JWT ────────────────────────────────────────────────────
export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      sendError(res, 'Access denied. No token provided.', 401);
      return;
    }
    const token = header.split(' ')[1];
    const decoded = verifyToken(token);
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch {
    sendError(res, 'Invalid or expired token.', 401);
  }
};

// ─── Optional auth: populate req.user if a valid token is present, ──────
// otherwise pass through. Used for endpoints that work for both guests
// and logged-in users (e.g. support ticket creation).
export const optionalAuthenticate = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      const token = header.split(' ')[1];
      const decoded = verifyToken(token);
      req.user = { id: decoded.id, role: decoded.role };
    }
  } catch {
    // Bad/expired token — proceed as guest, do not error.
  }
  next();
};

// ─── Role guard ───────────────────────────────────────────────────────────
export const authorize = (...roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      sendError(res, 'Access denied. Insufficient permissions.', 403);
      return;
    }
    next();
  };
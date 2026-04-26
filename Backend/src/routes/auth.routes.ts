import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import {
  register,
  login,
  socialLogin,
  getMe,
  updateProfile,
  googleAuth,
  googleOAuthCallback,
  uploadAvatarHandler,
} from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { arcjetAuth } from '../middleware/arcjet.middleware';
import { uploadAvatar } from '../middleware/upload.middleware';
import {
  registerSchema,
  loginSchema,
  socialLoginSchema,
  updateProfileSchema,
} from '../utils/validators';

const router = Router();

// ─── Email / Password ──────────────────────────────────────────────────────
router.post('/register', arcjetAuth, validate(registerSchema), register);
router.post('/login',    arcjetAuth, validate(loginSchema),    login);

// ─── Social login (manual name+email fallback) ─────────────────────────────
router.post('/social', arcjetAuth, validate(socialLoginSchema), socialLogin);

// ─── Google OAuth 2.0 ──────────────────────────────────────────────────────
router.get('/google',          googleAuth);
router.get('/google/callback', googleOAuthCallback);

// ─── Protected ─────────────────────────────────────────────────────────────
router.get('/me',        authenticate,                                getMe);
router.patch('/profile', authenticate, validate(updateProfileSchema), updateProfile);

// ─── Avatar upload (multipart/form-data, field name "image") ──────────────
// Wrapped so multer-specific errors return JSON instead of bubbling to HTML.
router.post(
  '/avatar',
  authenticate,
  (req: Request, res: Response, next: NextFunction) => {
    uploadAvatar.single('image')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        const msg =
          err.code === 'LIMIT_FILE_SIZE'
            ? 'Image must be under 2MB.'
            : err.message;
        return res.status(400).json({ success: false, message: msg });
      }
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  uploadAvatarHandler
);

export default router;
import { Request } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const AVATAR_DIR = path.join(process.cwd(), 'uploads', 'avatars');

// Ensure the avatars directory exists at module load.
if (!fs.existsSync(AVATAR_DIR)) {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATAR_DIR),
  filename: (req, file, cb) => {
    // <userId>-<random>.<ext>
    // Random suffix prevents stale CDN/browser caching from showing the old image.
    const userId = (req as Request & { user?: { id: string } }).user?.id || 'anon';
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const rand = crypto.randomBytes(6).toString('hex');
    cb(null, `${userId}-${rand}${ext}`);
  },
});

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed.'));
    return;
  }
  cb(null, true);
};

export const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB hard limit
    files: 1,
  },
});

export { AVATAR_DIR };
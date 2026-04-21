import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from './auth';

// ─── CONFIG ────────────────────────────────────────────────────────────────
const MAX_INPUT_SIZE_MB = 10;          // Accept up to 10MB from mobile
const OUTPUT_QUALITY = 60;             // JPEG quality (60 = good quality, ~40-80KB output)
const OUTPUT_MAX_WIDTH = 800;          // Max width in pixels
const OUTPUT_MAX_HEIGHT = 800;         // Max height in pixels
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];

// ─── UPLOAD DIR ────────────────────────────────────────────────────────────
const getUploadDir = (): string => {
  const dir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log('[Upload] Created uploads directory:', dir);
  }
  return dir;
};

// ─── MULTER — MEMORY STORAGE ───────────────────────────────────────────────
// Use memory storage so we can compress BEFORE writing to disk.
// File never touches disk at full size.
export const uploadPhoto = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_INPUT_SIZE_MB * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only JPEG/PNG/WebP allowed.`));
    }
  },
});

// ─── COMPRESS MIDDLEWARE ────────────────────────────────────────────────────
// Runs AFTER multer — compresses the buffer and saves to disk.
// Attach after uploadPhoto.single('photo') in routes.
export const compressPhoto = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // No file uploaded — skip (photo might be optional)
  if (!req.file || !req.file.buffer) {
    return next();
  }

  const startTime = Date.now();
  const originalSize = req.file.buffer.length;

  try {
    const uploadDir = getUploadDir();

    // Build unique filename
    const userId = (req as AuthRequest).user?.userId || 'unknown';
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const filename = `${userId}_${timestamp}_${random}.jpg`;
    const outputPath = path.join(uploadDir, filename);

    // Compress with sharp
    await sharp(req.file.buffer, { failOnError: false })
      .rotate()                              // Auto-rotate based on EXIF (fixes sideways selfies)
      .resize(OUTPUT_MAX_WIDTH, OUTPUT_MAX_HEIGHT, {
        fit: 'inside',                       // Maintain aspect ratio, never upscale
        withoutEnlargement: true,
      })
      .jpeg({
        quality: OUTPUT_QUALITY,
        progressive: true,                   // Progressive JPEG loads faster in browser
        mozjpeg: true,                       // Better compression algorithm
      })
      .toFile(outputPath);

    // Get output file size for logging
    const outputStats = fs.statSync(outputPath);
    const outputSize = outputStats.size;
    const compressionRatio = ((1 - outputSize / originalSize) * 100).toFixed(1);
    const elapsed = Date.now() - startTime;

    console.log(
      `[Upload] Compressed: ${(originalSize / 1024).toFixed(0)}KB → ${(outputSize / 1024).toFixed(0)}KB` +
      ` (${compressionRatio}% reduction) in ${elapsed}ms → ${filename}`
    );

    // Release the buffer from memory immediately after compression
    req.file.buffer = Buffer.alloc(0);

    // Attach file info to req for controller
    req.file.filename = filename;
    req.file.path = outputPath;
    req.file.size = outputSize;

    next();
  } catch (err: any) {
    // Release buffer on error too
    if (req.file?.buffer) req.file.buffer = Buffer.alloc(0);

    console.error('[Upload] Compression failed:', err?.message || err);

    // Don't block check-in if compression fails — just skip photo
    // Remove the file reference so controller treats it as no photo
    req.file = undefined as any;
    next();
  }
};

// ─── CLEANUP MIDDLEWARE ─────────────────────────────────────────────────────
// Optional: attach at end of route to ensure buffer is always freed
export const cleanupBuffer = (req: Request, res: Response, next: NextFunction): void => {
  if (req.file?.buffer) {
    req.file.buffer = Buffer.alloc(0);
  }
  next();
};

// ─── STORAGE STATS HELPER ──────────────────────────────────────────────────
export const getStorageStats = (): { totalFiles: number; totalSizeMB: number; oldestFile: string | null } => {
  try {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) return { totalFiles: 0, totalSizeMB: 0, oldestFile: null };

    const files = fs.readdirSync(uploadDir).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
    let totalSize = 0;
    let oldestTime = Infinity;
    let oldestFile: string | null = null;

    for (const file of files) {
      const stats = fs.statSync(path.join(uploadDir, file));
      totalSize += stats.size;
      if (stats.mtimeMs < oldestTime) {
        oldestTime = stats.mtimeMs;
        oldestFile = file;
      }
    }

    return {
      totalFiles: files.length,
      totalSizeMB: parseFloat((totalSize / (1024 * 1024)).toFixed(2)),
      oldestFile,
    };
  } catch {
    return { totalFiles: 0, totalSizeMB: 0, oldestFile: null };
  }
};

// ─── LEGACY PROFILE PHOTO UPLOAD (KEEP FOR BACKWARD COMPAT) ────────────────
export const uploadProfilePhoto = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, '../../uploads/profiles');
      fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const userId = (req as any).user?.userId || 'unknown';
      const timestamp = Date.now();
      const ext = path.extname(file.originalname);
      cb(null, `profile_${userId}_${timestamp}${ext}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG images are allowed'));
    }
  },
  limits: {
    fileSize: MAX_INPUT_SIZE_MB * 1024 * 1024,
  },
});

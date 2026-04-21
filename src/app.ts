// /Users/khalid/Desktop/Frontline/backend/src/app.ts
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import attendanceRoutes from './routes/attendance';
import employeeRoutes from './routes/employees';
import adminRoutes from './routes/admin';
import policyRoutes from './routes/policy';
import invitationRoutes from './routes/invitations';

dotenv.config();

// Validate JWT secret length on startup
const jwtSecret = process.env.JWT_SECRET || '';
if (jwtSecret.length < 32) {
  console.warn('⚠️  WARNING: JWT_SECRET is too short (minimum 32 chars). Update your .env file.');
  console.warn(`   Current length: ${jwtSecret.length} chars`);
}
if (jwtSecret.length >= 32 && jwtSecret.length < 64) {
  console.log(`ℹ️  JWT_SECRET length: ${jwtSecret.length} chars (recommended: 64+)`);
} else if (jwtSecret.length >= 64) {
  console.log(`✅ JWT_SECRET length: ${jwtSecret.length} chars (strong)`);
}

const app: Application = express();

// ============================================================================
// SECURITY: Trust proxy BEFORE all middleware
// ============================================================================
app.set('trust proxy', 1);

// ============================================================================
// SECURITY: Helmet (API-only config, no CSP for HTML)
// ============================================================================
app.use(
  helmet({
    contentSecurityPolicy: false, // Not serving HTML
    crossOriginEmbedderPolicy: false, // API doesn't need COEP
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
  })
);

// ============================================================================
// COMPRESSION: gzip/deflate for responses
// ============================================================================
app.use(compression());

// ============================================================================
// CORS: Whitelist-based origin validation
// ============================================================================
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`⚠️  Blocked CORS request from unauthorized origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ============================================================================
// BODY PARSING: Size limits (1MB for JSON, 10MB for URL-encoded with files)
// ============================================================================
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================================
// RATE LIMITING: Global limit (200 req/15min, skip /health)
// ============================================================================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health', // Skip health checks
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
});

app.use(limiter);

// ============================================================================
// HEALTH CHECK: No auth, minimal info
// ============================================================================
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
  });
});

// ============================================================================
// UPLOADS: Path traversal protection + cache headers + CORS for images
// ============================================================================
app.use('/uploads', (req, res, next) => {
  // Path traversal protection
  const requestedPath = decodeURIComponent(req.path);
  if (requestedPath.includes('..') || requestedPath.includes('~')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid file path',
    });
  }

  // CORS headers for images (allow all origins for static assets)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  // Cache headers for static assets
  res.setHeader('Cache-Control', 'public, max-age=604800, immutable'); // 7 days
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}, express.static(path.join(__dirname, '../uploads'), {
  maxAge: '7d',
  etag: true,
  lastModified: true,
  dotfiles: 'deny', // Block hidden files
}));

// ============================================================================
// ROOT ENDPOINT: API info
// ============================================================================
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Frontline HR API - Phase 1',
    version: '1.0.0',
    routes: {
      auth: '/api/auth',
      attendance: '/api/attendance',
      employees: '/api/employees',
      admin: '/api/admin',
      policy: '/api/policy',
      invites: '/api/invites',
    },
  });
});

// ============================================================================
// API ROUTES
// ============================================================================
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/policy', policyRoutes);
app.use('/api/invites', invitationRoutes);

// ============================================================================
// 404 HANDLER
// ============================================================================
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// ============================================================================
// GLOBAL ERROR HANDLER: Hide stack traces in production
// ============================================================================
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // Log full error server-side (always)
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // File size errors
  if (err.message.includes('File too large')) {
    return res.status(413).json({
      success: false,
      error: 'File size exceeds maximum limit (10MB)',
    });
  }

  // File type errors
  if (err.message.includes('Only JPEG and PNG')) {
    return res.status(400).json({
      success: false,
      error: 'Only JPEG and PNG images are allowed',
    });
  }

  // CORS errors
  if (err.message.includes('Not allowed by CORS')) {
    return res.status(403).json({
      success: false,
      error: 'Origin not allowed',
    });
  }

  // Generic 500 — NEVER leak stack trace in production
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message, // Only show detailed message in dev
  });
});

export default app;

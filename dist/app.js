"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// /Users/khalid/Desktop/Frontline/backend/src/app.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const attendance_1 = __importDefault(require("./routes/attendance"));
const employees_1 = __importDefault(require("./routes/employees"));
const admin_1 = __importDefault(require("./routes/admin"));
const policy_1 = __importDefault(require("./routes/policy"));
const invitations_1 = __importDefault(require("./routes/invitations"));
dotenv_1.default.config();
// Validate JWT secret length on startup
const jwtSecret = process.env.JWT_SECRET || '';
if (jwtSecret.length < 32) {
    console.warn('⚠️  WARNING: JWT_SECRET is too short (minimum 32 chars). Update your .env file.');
    console.warn(`   Current length: ${jwtSecret.length} chars`);
}
if (jwtSecret.length >= 32 && jwtSecret.length < 64) {
    console.log(`ℹ️  JWT_SECRET length: ${jwtSecret.length} chars (recommended: 64+)`);
}
else if (jwtSecret.length >= 64) {
    console.log(`✅ JWT_SECRET length: ${jwtSecret.length} chars (strong)`);
}
const app = (0, express_1.default)();
// ============================================================================
// SECURITY: Trust proxy BEFORE all middleware
// ============================================================================
app.set('trust proxy', 1);
// ============================================================================
// SECURITY: Helmet (API-only config, no CSP for HTML)
// ============================================================================
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false, // Not serving HTML
    crossOriginEmbedderPolicy: false, // API doesn't need COEP
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
    },
}));
// ============================================================================
// COMPRESSION: gzip/deflate for responses
// ============================================================================
app.use((0, compression_1.default)());
// ============================================================================
// CORS: Whitelist-based origin validation
// ============================================================================
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim());
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            console.warn(`⚠️  Blocked CORS request from unauthorized origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// ============================================================================
// BODY PARSING: Size limits (1MB for JSON, 10MB for URL-encoded with files)
// ============================================================================
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// ============================================================================
// RATE LIMITING: Global limit (200 req/15min, skip /health)
// ============================================================================
const limiter = (0, express_rate_limit_1.default)({
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
app.get('/health', (req, res) => {
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
}, express_1.default.static(path_1.default.join(__dirname, '../uploads'), {
    maxAge: '7d',
    etag: true,
    lastModified: true,
    dotfiles: 'deny', // Block hidden files
}));
// ============================================================================
// ROOT ENDPOINT: API info
// ============================================================================
app.get('/', (req, res) => {
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
app.use('/api/auth', auth_1.default);
app.use('/api/attendance', attendance_1.default);
app.use('/api/employees', employees_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/policy', policy_1.default);
app.use('/api/invites', invitations_1.default);
// ============================================================================
// 404 HANDLER
// ============================================================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
    });
});
// ============================================================================
// GLOBAL ERROR HANDLER: Hide stack traces in production
// ============================================================================
app.use((err, req, res, next) => {
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
exports.default = app;
//# sourceMappingURL=app.js.map
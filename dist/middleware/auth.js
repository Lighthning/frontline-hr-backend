"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwt_1 = require("../utils/jwt");
const db_1 = __importDefault(require("../db"));
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ success: false, error: 'No token provided' });
            return;
        }
        const token = authHeader.substring(7);
        let decoded;
        // Step 1: Verify JWT signature and expiry
        try {
            decoded = (0, jwt_1.verifyToken)(token);
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                res.status(401).json({
                    success: false,
                    error: 'Token has expired',
                    code: 'TOKEN_EXPIRED'
                });
                return;
            }
            if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                res.status(401).json({
                    success: false,
                    error: 'Invalid token signature',
                    code: 'INVALID_TOKEN'
                });
                return;
            }
            // Other JWT errors
            res.status(401).json({
                success: false,
                error: 'Token verification failed',
                code: 'TOKEN_ERROR'
            });
            return;
        }
        // Step 2: Verify user still exists and is active, get FRESH role from DB
        const result = await db_1.default.query('SELECT id, email, role, is_active FROM users WHERE id = $1', [decoded.userId]);
        if (result.rows.length === 0) {
            res.status(401).json({
                success: false,
                error: 'User account not found',
                code: 'USER_NOT_FOUND'
            });
            return;
        }
        const user = result.rows[0];
        // Step 3: Verify user is still active
        if (!user.is_active) {
            res.status(403).json({
                success: false,
                error: 'Account has been deactivated',
                code: 'ACCOUNT_DEACTIVATED'
            });
            return;
        }
        // Step 4: Attach user to request with FRESH role from DB (not JWT role)
        // This ensures demoted users don't retain elevated privileges
        req.user = {
            userId: user.id,
            email: user.email,
            role: user.role, // CRITICAL: Use DB role, not token role
        };
        next();
    }
    catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication failed',
            code: 'AUTH_ERROR'
        });
    }
};
exports.authenticate = authenticate;
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                code: 'INSUFFICIENT_PERMISSIONS',
                required: allowedRoles,
                current: req.user.role
            });
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
//# sourceMappingURL=auth.js.map
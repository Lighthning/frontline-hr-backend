"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentUser = exports.logout = exports.refresh = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = __importDefault(require("../db"));
const jwt_1 = require("../utils/jwt");
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ success: false, error: 'Email and password are required' });
            return;
        }
        const result = await db_1.default.query('SELECT id, employee_id, full_name, email, password_hash, role, department, designation, is_active FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            res.status(401).json({ success: false, error: 'Invalid credentials' });
            return;
        }
        const user = result.rows[0];
        if (!user.is_active) {
            res.status(403).json({ success: false, error: 'Account is deactivated' });
            return;
        }
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!isValidPassword) {
            res.status(401).json({ success: false, error: 'Invalid credentials' });
            return;
        }
        const tokenPayload = {
            userId: user.id,
            email: user.email,
            role: user.role,
        };
        const accessToken = (0, jwt_1.generateAccessToken)(tokenPayload);
        const refreshToken = (0, jwt_1.generateRefreshToken)(tokenPayload);
        await db_1.default.query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, refreshToken, (0, jwt_1.getRefreshTokenExpiry)()]);
        res.json({
            success: true,
            data: {
                accessToken,
                refreshToken,
                user: {
                    id: user.id,
                    employeeId: user.employee_id,
                    fullName: user.full_name,
                    email: user.email,
                    role: user.role,
                    department: user.department,
                    designation: user.designation,
                },
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.login = login;
const refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            res.status(400).json({ success: false, error: 'Refresh token is required' });
            return;
        }
        const decoded = (0, jwt_1.verifyToken)(refreshToken);
        const result = await db_1.default.query('SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND expires_at > NOW()', [refreshToken, decoded.userId]);
        if (result.rows.length === 0) {
            res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
            return;
        }
        const tokenPayload = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
        };
        const newAccessToken = (0, jwt_1.generateAccessToken)(tokenPayload);
        res.json({
            success: true,
            data: {
                accessToken: newAccessToken,
            },
        });
    }
    catch (error) {
        res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
    }
};
exports.refresh = refresh;
const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            res.status(400).json({ success: false, error: 'Refresh token is required' });
            return;
        }
        await db_1.default.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
        res.json({ success: true, data: { message: 'Logged out successfully' } });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.logout = logout;
const getCurrentUser = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const result = await db_1.default.query(`SELECT id, employee_id, full_name, email, phone, department, designation, role,
       date_of_joining, is_active, created_at
       FROM users WHERE id = $1`, [req.user.userId]);
        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: 'User not found' });
            return;
        }
        const user = result.rows[0];
        res.json({
            success: true,
            data: {
                id: user.id,
                employeeId: user.employee_id,
                fullName: user.full_name,
                email: user.email,
                phone: user.phone,
                department: user.department,
                designation: user.designation,
                role: user.role,
                dateOfJoining: user.date_of_joining,
                isActive: user.is_active,
                createdAt: user.created_at,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.getCurrentUser = getCurrentUser;
//# sourceMappingURL=authController.js.map
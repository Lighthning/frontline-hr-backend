"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const db_1 = __importDefault(require("../db"));
const router = (0, express_1.Router)();
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // 20 attempts
    message: { success: false, error: 'Too many login attempts, please try again in 5 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});
router.post('/login', authLimiter, authController_1.login);
router.post('/refresh', authController_1.refresh);
router.post('/logout', authController_1.logout);
router.get('/me', auth_1.authenticate, authController_1.getCurrentUser);
router.put('/change-password', auth_1.authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            res.status(400).json({ success: false, error: 'Both current and new passwords are required.' });
            return;
        }
        if (newPassword.length < 8) {
            res.status(400).json({ success: false, error: 'New password must be at least 8 characters.' });
            return;
        }
        const userRes = await db_1.default.query('SELECT password_hash FROM users WHERE id = $1', [req.user.userId]);
        const user = userRes.rows[0];
        if (!user) {
            res.status(404).json({ success: false, error: 'User not found.' });
            return;
        }
        const valid = await bcryptjs_1.default.compare(currentPassword, user.password_hash);
        if (!valid) {
            res.status(400).json({ success: false, error: 'Current password is incorrect.' });
            return;
        }
        const hash = await bcryptjs_1.default.hash(newPassword, 12);
        await db_1.default.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.userId]);
        res.json({ success: true, message: 'Password changed successfully.' });
    }
    catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, error: 'Internal server error.' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map
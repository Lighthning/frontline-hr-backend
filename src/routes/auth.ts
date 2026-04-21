import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { login, refresh, logout, getCurrentUser } from '../controllers/authController';
import { authenticate, AuthRequest } from '../middleware/auth';
import pool from '../db';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 attempts
  message: { success: false, error: 'Too many login attempts, please try again in 5 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', authLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', authenticate, getCurrentUser);

router.put('/change-password', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
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

    const userRes = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user!.userId]);
    const user = userRes.rows[0];

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found.' });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      res.status(400).json({ success: false, error: 'Current password is incorrect.' });
      return;
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user!.userId]);

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

export default router;

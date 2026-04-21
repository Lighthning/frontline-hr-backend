import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../db';
import { AuthRequest } from '../middleware/auth';
import { generateAccessToken, generateRefreshToken, getRefreshTokenExpiry } from '../utils/jwt';

const validatePassword = (password: string): boolean => {
  return password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);
};

export const sendInvitation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (req.user.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return;
    }

    const { firstName, lastName, email, role } = req.body;

    if (!firstName || !lastName || !email || !role) {
      res.status(400).json({ success: false, error: 'First name, last name, email, and role are required' });
      return;
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      res.status(409).json({ success: false, error: 'User with this email already exists' });
      return;
    }

    // Check if invitation already exists
    const existingInvite = await pool.query(
      'SELECT id FROM employee_invitations WHERE email = $1 AND is_used = false AND expires_at > NOW()',
      [email]
    );
    if (existingInvite.rows.length > 0) {
      res.status(409).json({ success: false, error: 'Pending invitation already exists for this email' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const fullName = `${firstName} ${lastName}`;

    const result = await pool.query(
      `INSERT INTO employee_invitations (email, full_name, role, token, expires_at, invited_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, full_name, role, token, expires_at`,
      [email, fullName, role, token, expiresAt, req.user.userId]
    );

    const invitation = result.rows[0];
    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invitation?token=${token}`;

    res.status(201).json({
      success: true,
      data: {
        id: invitation.id,
        fullName: invitation.full_name,
        email: invitation.email,
        role: invitation.role,
        inviteLink,
        expiresAt: invitation.expires_at,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const validateInvitation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({ success: false, error: 'Token is required' });
      return;
    }

    const result = await pool.query(
      'SELECT * FROM employee_invitations WHERE token = $1 AND is_used = false AND expires_at > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Invalid or expired invitation' });
      return;
    }

    const invitation = result.rows[0];

    res.json({
      success: true,
      data: {
        fullName: invitation.full_name,
        email: invitation.email,
        role: invitation.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const acceptInvitation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      res.status(400).json({ success: false, error: 'Token, password, and confirm password are required' });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({ success: false, error: 'Passwords do not match' });
      return;
    }

    if (!validatePassword(password)) {
      res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character',
      });
      return;
    }

    const inviteResult = await pool.query(
      'SELECT * FROM employee_invitations WHERE token = $1 AND is_used = false AND expires_at > NOW()',
      [token]
    );

    if (inviteResult.rows.length === 0) {
      res.status(410).json({ success: false, error: 'Invalid or expired invitation' });
      return;
    }

    const invitation = inviteResult.rows[0];

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [invitation.email]);
    if (existingUser.rows.length > 0) {
      res.status(409).json({ success: false, error: 'User already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Generate unique employee ID
    const lastEmployee = await pool.query('SELECT employee_id FROM users ORDER BY id DESC LIMIT 1');
    let newEmployeeId = 'FL001';
    if (lastEmployee.rows.length > 0) {
      const lastId = lastEmployee.rows[0].employee_id;
      const match = lastId.match(/FL(\d+)/);
      if (match) {
        const num = parseInt(match[1]) + 1;
        newEmployeeId = `FL${String(num).padStart(3, '0')}`;
      }
    }

    // Create user
    const userResult = await pool.query(
      `INSERT INTO users (employee_id, full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, employee_id, full_name, email, role`,
      [`${newEmployeeId}`, invitation.full_name, invitation.email, passwordHash, invitation.role]
    );

    const user = userResult.rows[0];

    // Mark invitation as accepted
    await pool.query('UPDATE employee_invitations SET is_used = true, accepted_at = NOW() WHERE id = $1', [invitation.id]);

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, getRefreshTokenExpiry()]
    );

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
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getAllInvitations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (req.user.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return;
    }

    const result = await pool.query(
      'SELECT * FROM employee_invitations ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      data: result.rows.map((inv) => ({
        id: inv.id,
        fullName: inv.full_name,
        email: inv.email,
        role: inv.role,
        status: inv.is_used ? 'accepted' : (new Date(inv.expires_at) < new Date() ? 'expired' : 'pending'),
        expiresAt: inv.expires_at,
        acceptedAt: inv.accepted_at,
        createdAt: inv.created_at,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

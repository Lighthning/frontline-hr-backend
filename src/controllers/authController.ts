import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  getRefreshTokenExpiry,
} from '../utils/jwt';
import { AuthRequest } from '../middleware/auth';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' });
      return;
    }

    const result = await pool.query(
      'SELECT id, employee_id, full_name, email, password_hash, role, department, designation, is_active FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    const user = result.rows[0];

    if (!user.is_active) {
      res.status(403).json({ success: false, error: 'Account is deactivated' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

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
          department: user.department,
          designation: user.designation,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ success: false, error: 'Refresh token is required' });
      return;
    }

    const decoded = verifyToken(refreshToken);

    const result = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND expires_at > NOW()',
      [refreshToken, decoded.userId]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
      return;
    }

    const tokenPayload = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    const newAccessToken = generateAccessToken(tokenPayload);

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ success: false, error: 'Refresh token is required' });
      return;
    }

    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);

    res.json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const result = await pool.query(
      `SELECT id, employee_id, full_name, email, phone, department, designation, role,
       date_of_joining, is_active, created_at
       FROM users WHERE id = $1`,
      [req.user.userId]
    );

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
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyToken, TokenPayload } from '../utils/jwt';
import pool from '../db';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7);
    let decoded: TokenPayload;

    // Step 1: Verify JWT signature and expiry
    try {
      decoded = verifyToken(token);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          error: 'Token has expired',
          code: 'TOKEN_EXPIRED'
        });
        return;
      }
      if (error instanceof jwt.JsonWebTokenError) {
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
    const result = await pool.query(
      'SELECT id, email, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

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
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
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

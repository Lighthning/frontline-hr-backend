import { Response } from 'express';
import pool from '../db';
import { AuthRequest } from '../middleware/auth';

export const getGeofenceLocations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const result = await pool.query(
      'SELECT * FROM geofence_locations ORDER BY id ASC'
    );

    res.json({
      success: true,
      data: result.rows.map((location) => ({
        id: location.id,
        name: location.name,
        latitude: parseFloat(location.latitude),
        longitude: parseFloat(location.longitude),
        radiusMeters: location.radius_meters,
        radius: location.radius_meters,
        isActive: location.is_active,
        createdAt: location.created_at,
        address: location.address || '',
        branchCode: location.branch_code || '',
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const updateGeofenceLocation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const locationId = parseInt(req.params.id);

    if (isNaN(locationId)) {
      res.status(400).json({ success: false, error: 'Invalid location ID' });
      return;
    }

    const { name, latitude, longitude, radiusMeters, isActive, address, branchCode } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (latitude !== undefined) {
      updates.push(`latitude = $${paramCount}`);
      values.push(latitude);
      paramCount++;
    }

    if (longitude !== undefined) {
      updates.push(`longitude = $${paramCount}`);
      values.push(longitude);
      paramCount++;
    }

    if (radiusMeters !== undefined) {
      updates.push(`radius_meters = $${paramCount}`);
      values.push(radiusMeters);
      paramCount++;
    }

    if (isActive !== undefined) {
      updates.push(`is_active = $${paramCount}`);
      values.push(isActive);
      paramCount++;
    }

    if (address !== undefined) {
      updates.push(`address = $${paramCount}`);
      values.push(address);
      paramCount++;
    }

    if (branchCode !== undefined) {
      updates.push(`branch_code = $${paramCount}`);
      values.push(branchCode);
      paramCount++;
    }

    if (updates.length === 0) {
      res.status(400).json({ success: false, error: 'No fields to update' });
      return;
    }

    values.push(locationId);

    const query = `
      UPDATE geofence_locations SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Geofence location not found' });
      return;
    }

    const location = result.rows[0];

    res.json({
      success: true,
      data: {
        id: location.id,
        name: location.name,
        latitude: parseFloat(location.latitude),
        longitude: parseFloat(location.longitude),
        radiusMeters: location.radius_meters,
        isActive: location.is_active,
        createdAt: location.created_at,
        address: location.address || '',
        branchCode: location.branch_code || '',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    const totalEmployeesResult = await pool.query(
      'SELECT COUNT(*) FROM users WHERE is_active = true'
    );
    const totalEmployees = parseInt(totalEmployeesResult.rows[0].count);

    const presentTodayResult = await pool.query(
      'SELECT COUNT(*) FROM attendance WHERE date = $1 AND check_in_time IS NOT NULL',
      [today]
    );
    const presentToday = parseInt(presentTodayResult.rows[0].count);

    const lateTodayResult = await pool.query(
      "SELECT COUNT(*) FROM attendance WHERE date = $1 AND status = 'late'",
      [today]
    );
    const lateToday = parseInt(lateTodayResult.rows[0].count);

    const absentToday = totalEmployees - presentToday;

    const departmentStatsResult = await pool.query(
      `SELECT u.department, COUNT(a.id) as present_count
       FROM users u
       LEFT JOIN attendance a ON u.id = a.user_id AND a.date = $1
       WHERE u.is_active = true
       GROUP BY u.department
       ORDER BY u.department`,
      [today]
    );

    const checkedInResult = await pool.query(
      'SELECT COUNT(*) FROM attendance WHERE date = $1 AND check_in_time IS NOT NULL AND check_out_time IS NULL',
      [today]
    );
    const checkedIn = parseInt(checkedInResult.rows[0].count);

    const checkedOutResult = await pool.query(
      'SELECT COUNT(*) FROM attendance WHERE date = $1 AND check_out_time IS NOT NULL',
      [today]
    );
    const checkedOut = parseInt(checkedOutResult.rows[0].count);

    res.json({
      success: true,
      data: {
        totalEmployees,
        presentToday,
        absentToday,
        lateToday,
        checkedIn,
        checkedOut,
        departmentStats: departmentStatsResult.rows.map((row) => ({
          department: row.department || 'Unassigned',
          presentCount: parseInt(row.present_count),
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

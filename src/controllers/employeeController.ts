import { Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db';
import { AuthRequest } from '../middleware/auth';

// ============================================================================
// SHARED: Full user SELECT with all columns
// ============================================================================
const USER_SELECT = `
  id, employee_id, full_name, email, phone, department, designation, role,
  profile_photo_url, date_of_joining, date_of_birth, gender, address, city,
  nationality, iqama_number, iqama_expiry,
  emergency_contact_name, emergency_contact_phone,
  bank_account_number, bank_name, salary,
  is_active, created_at, updated_at
`;

// ============================================================================
// SHARED: Map database row to camelCase response
// ============================================================================
const mapUser = (u: any) => ({
  id: u.id,
  employeeId: u.employee_id,
  fullName: u.full_name,
  email: u.email,
  phone: u.phone || null,
  department: u.department || null,
  designation: u.designation || null,
  role: u.role,
  profilePhotoUrl: u.profile_photo_url || null,
  dateOfJoining: u.date_of_joining || null,
  dateOfBirth: u.date_of_birth || null,
  gender: u.gender || null,
  address: u.address || null,
  city: u.city || null,
  nationality: u.nationality || null,
  iqamaNumber: u.iqama_number || null,
  iqamaExpiry: u.iqama_expiry || null,
  emergencyContactName: u.emergency_contact_name || null,
  emergencyContactPhone: u.emergency_contact_phone || null,
  bankAccountNumber: u.bank_account_number || null,
  bankName: u.bank_name || null,
  salary: u.salary ? parseFloat(u.salary) : null,
  isActive: u.is_active,
  createdAt: u.created_at,
  updatedAt: u.updated_at,
});

// ============================================================================
// GET /api/employees/me — Get current authenticated employee (for mobile)
// ============================================================================
export const getCurrentEmployee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const result = await pool.query(
      `SELECT ${USER_SELECT} FROM users WHERE id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Employee not found' });
      return;
    }

    res.json({ success: true, data: mapUser(result.rows[0]) });
  } catch (error) {
    console.error('[getCurrentEmployee]', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ============================================================================
// GET /api/employees/:id — Get one employee by ID
// ============================================================================
export const getEmployeeById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const employeeId = parseInt(id);

    if (isNaN(employeeId)) {
      res.status(400).json({ success: false, error: 'Invalid employee ID' });
      return;
    }

    const result = await pool.query(
      `SELECT ${USER_SELECT} FROM users WHERE id = $1`,
      [employeeId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Employee not found' });
      return;
    }

    res.json({ success: true, data: mapUser(result.rows[0]) });
  } catch (error) {
    console.error('[getEmployeeById]', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ============================================================================
// GET /api/employees — List all employees with pagination and filters
// ============================================================================
export const getAllEmployees = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = (page - 1) * limit;
    const search = req.query.search as string;
    const department = req.query.department as string;
    const role = req.query.role as string;
    const isActive = req.query.isActive;

    let where = 'WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      where += ` AND (full_name ILIKE $${paramCount} OR email ILIKE $${paramCount} OR employee_id ILIKE $${paramCount})`;
      paramCount++;
    }

    if (department && department.trim()) {
      params.push(department.trim());
      where += ` AND department = $${paramCount}`;
      paramCount++;
    }

    if (role && role.trim()) {
      params.push(role.trim());
      where += ` AND role = $${paramCount}`;
      paramCount++;
    }

    if (isActive !== undefined) {
      const activeValue = String(isActive) === 'true';
      params.push(activeValue);
      where += ` AND is_active = $${paramCount}`;
      paramCount++;
    }

    // Get total count
    const countResult = await pool.query(`SELECT COUNT(*) FROM users ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    params.push(limit, offset);
    const result = await pool.query(
      `SELECT ${USER_SELECT} FROM users ${where} ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      params
    );

    res.json({
      success: true,
      data: {
        employees: result.rows.map(mapUser),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[getAllEmployees]', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ============================================================================
// POST /api/employees — Create new employee with full HR fields
// ============================================================================
export const createEmployee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    // Support both camelCase and snake_case for flexibility
    const {
      employee_id, employeeId,
      full_name, fullName,
      email, password,
      phone, department, designation, role,
      profile_photo_url, profilePhotoUrl,
      date_of_joining, dateOfJoining,
      date_of_birth, dateOfBirth,
      gender, address, city, nationality,
      iqama_number, iqamaNumber,
      iqama_expiry, iqamaExpiry,
      emergency_contact_name, emergencyContactName,
      emergency_contact_phone, emergencyContactPhone,
      bank_account_number, bankAccountNumber,
      bank_name, bankName,
      salary,
    } = req.body;

    // Normalize field names
    const empId = employee_id || employeeId;
    const name = full_name || fullName;
    const joining = date_of_joining || dateOfJoining || null;
    const birth = date_of_birth || dateOfBirth || null;
    const iqamaNum = iqama_number || iqamaNumber || null;
    const iqamaExp = iqama_expiry || iqamaExpiry || null;
    const emergName = emergency_contact_name || emergencyContactName || null;
    const emergPhone = emergency_contact_phone || emergencyContactPhone || null;
    const bankAcc = bank_account_number || bankAccountNumber || null;
    const bank = bank_name || bankName || null;
    const photoUrl = profile_photo_url || profilePhotoUrl || null;

    // Validation
    if (!empId || !name || !email || !password) {
      res.status(400).json({
        success: false,
        error: 'employee_id, full_name, email and password are required',
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters',
      });
      return;
    }

    // Validate role
    const validRoles = ['employee', 'hr', 'admin', 'manager'];
    if (role && !validRoles.includes(role)) {
      res.status(400).json({
        success: false,
        error: `Role must be one of: ${validRoles.join(', ')}`,
      });
      return;
    }

    // Check for duplicates
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR employee_id = $2',
      [email.toLowerCase().trim(), empId]
    );

    if (existing.rows.length > 0) {
      res.status(409).json({
        success: false,
        error: 'Employee with this email or employee ID already exists',
      });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Insert new employee
    const result = await pool.query(
      `INSERT INTO users (
        employee_id, full_name, email, password_hash, phone, department, designation, role,
        profile_photo_url, date_of_joining, date_of_birth, gender, address, city,
        nationality, iqama_number, iqama_expiry,
        emergency_contact_name, emergency_contact_phone,
        bank_account_number, bank_name, salary
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14,
        $15, $16, $17,
        $18, $19,
        $20, $21, $22
      ) RETURNING ${USER_SELECT}`,
      [
        empId,
        name,
        email.toLowerCase().trim(),
        passwordHash,
        phone || null,
        department || null,
        designation || null,
        role || 'employee',
        photoUrl,
        joining,
        birth,
        gender || null,
        address || null,
        city || null,
        nationality || null,
        iqamaNum,
        iqamaExp,
        emergName,
        emergPhone,
        bankAcc,
        bank,
        salary || null,
      ]
    );

    // Create default attendance policy
    await pool.query(
      `INSERT INTO employee_attendance_policy (user_id, geofence_override, photo_required, allow_remote)
       VALUES ($1, 'office', true, false)
       ON CONFLICT (user_id) DO NOTHING`,
      [result.rows[0].id]
    );

    res.status(201).json({
      success: true,
      data: mapUser(result.rows[0]),
    });
  } catch (error: any) {
    console.error('[createEmployee]', error);
    if (error.code === '23505') {
      res.status(409).json({
        success: false,
        error: 'Employee with this email or employee ID already exists',
      });
      return;
    }
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ============================================================================
// PUT /api/employees/:id — Update employee with full HR fields
// ============================================================================
export const updateEmployee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const employeeId = parseInt(id);

    if (isNaN(employeeId)) {
      res.status(400).json({ success: false, error: 'Invalid employee ID' });
      return;
    }

    // Check if employee exists
    const existing = await pool.query('SELECT id FROM users WHERE id = $1', [employeeId]);
    if (existing.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Employee not found' });
      return;
    }

    // Support both camelCase and snake_case
    const {
      full_name, fullName,
      phone, department, designation, role,
      profile_photo_url, profilePhotoUrl,
      date_of_joining, dateOfJoining,
      date_of_birth, dateOfBirth,
      gender, address, city, nationality,
      iqama_number, iqamaNumber,
      iqama_expiry, iqamaExpiry,
      emergency_contact_name, emergencyContactName,
      emergency_contact_phone, emergencyContactPhone,
      bank_account_number, bankAccountNumber,
      bank_name, bankName,
      salary,
      is_active, isActive,
    } = req.body;

    const result = await pool.query(
      `UPDATE users SET
        full_name = COALESCE($1, full_name),
        phone = COALESCE($2, phone),
        department = COALESCE($3, department),
        designation = COALESCE($4, designation),
        role = COALESCE($5, role),
        profile_photo_url = COALESCE($6, profile_photo_url),
        date_of_joining = COALESCE($7, date_of_joining),
        date_of_birth = COALESCE($8, date_of_birth),
        gender = COALESCE($9, gender),
        address = COALESCE($10, address),
        city = COALESCE($11, city),
        nationality = COALESCE($12, nationality),
        iqama_number = COALESCE($13, iqama_number),
        iqama_expiry = COALESCE($14, iqama_expiry),
        emergency_contact_name = COALESCE($15, emergency_contact_name),
        emergency_contact_phone = COALESCE($16, emergency_contact_phone),
        bank_account_number = COALESCE($17, bank_account_number),
        bank_name = COALESCE($18, bank_name),
        salary = COALESCE($19, salary),
        is_active = COALESCE($20, is_active),
        updated_at = NOW()
      WHERE id = $21
      RETURNING ${USER_SELECT}`,
      [
        full_name || fullName || null,
        phone || null,
        department || null,
        designation || null,
        role || null,
        profile_photo_url || profilePhotoUrl || null,
        date_of_joining || dateOfJoining || null,
        date_of_birth || dateOfBirth || null,
        gender || null,
        address || null,
        city || null,
        nationality || null,
        iqama_number || iqamaNumber || null,
        iqama_expiry || iqamaExpiry || null,
        emergency_contact_name || emergencyContactName || null,
        emergency_contact_phone || emergencyContactPhone || null,
        bank_account_number || bankAccountNumber || null,
        bank_name || bankName || null,
        salary || null,
        is_active !== undefined ? is_active : isActive !== undefined ? isActive : null,
        employeeId,
      ]
    );

    res.json({
      success: true,
      data: mapUser(result.rows[0]),
    });
  } catch (error) {
    console.error('[updateEmployee]', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ============================================================================
// DELETE /api/employees/:id — Delete employee
// ============================================================================
export const deleteEmployee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const employeeId = parseInt(id);

    if (isNaN(employeeId)) {
      res.status(400).json({ success: false, error: 'Invalid employee ID' });
      return;
    }

    // Prevent self-deletion
    if (employeeId === req.user.userId) {
      res.status(400).json({
        success: false,
        error: 'Cannot delete your own account',
      });
      return;
    }

    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, full_name, email',
      [employeeId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Employee not found' });
      return;
    }

    res.json({
      success: true,
      message: `Employee ${result.rows[0].full_name} deleted successfully`,
    });
  } catch (error) {
    console.error('[deleteEmployee]', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ============================================================================
// PATCH /api/employees/:id/toggle-active — Toggle employee active status
// ============================================================================
export const toggleEmployeeActive = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const employeeId = parseInt(id);

    if (isNaN(employeeId)) {
      res.status(400).json({ success: false, error: 'Invalid employee ID' });
      return;
    }

    const result = await pool.query(
      'UPDATE users SET is_active = NOT is_active, updated_at = NOW() WHERE id = $1 RETURNING id, full_name, is_active',
      [employeeId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Employee not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        id: result.rows[0].id,
        fullName: result.rows[0].full_name,
        isActive: result.rows[0].is_active,
      },
    });
  } catch (error) {
    console.error('[toggleEmployeeActive]', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ============================================================================
// PUT /api/employees/me — Update current employee (self-update)
// ============================================================================
export const updateCurrentEmployee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    // Support both camelCase and snake_case
    const {
      phone, address, city,
      emergency_contact_name, emergencyContactName,
      emergency_contact_phone, emergencyContactPhone,
      date_of_birth, dateOfBirth,
      gender,
    } = req.body;

    const result = await pool.query(
      `UPDATE users SET
        phone = COALESCE($1, phone),
        address = COALESCE($2, address),
        city = COALESCE($3, city),
        emergency_contact_name = COALESCE($4, emergency_contact_name),
        emergency_contact_phone = COALESCE($5, emergency_contact_phone),
        date_of_birth = COALESCE($6, date_of_birth),
        gender = COALESCE($7, gender),
        updated_at = NOW()
      WHERE id = $8
      RETURNING ${USER_SELECT}`,
      [
        phone || null,
        address || null,
        city || null,
        emergency_contact_name || emergencyContactName || null,
        emergency_contact_phone || emergencyContactPhone || null,
        date_of_birth || dateOfBirth || null,
        gender || null,
        req.user.userId,
      ]
    );

    res.json({
      success: true,
      data: mapUser(result.rows[0]),
    });
  } catch (error) {
    console.error('[updateCurrentEmployee]', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ============================================================================
// POST /api/employees/me/photo — Upload profile photo
// ============================================================================
export const uploadProfilePhoto = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, error: 'No photo file provided' });
      return;
    }

    const photoUrl = `/uploads/${req.file.filename}`;

    const result = await pool.query(
      'UPDATE users SET profile_photo_url = $1, updated_at = NOW() WHERE id = $2 RETURNING profile_photo_url',
      [photoUrl, req.user.userId]
    );

    res.json({
      success: true,
      data: {
        profilePhotoUrl: result.rows[0].profile_photo_url,
      },
    });
  } catch (error) {
    console.error('[uploadProfilePhoto]', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

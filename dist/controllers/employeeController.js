"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEmployee = exports.updateEmployee = exports.getEmployeeById = exports.createEmployee = exports.getAllEmployees = exports.uploadProfilePhoto = exports.updateCurrentEmployee = exports.getCurrentEmployee = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = __importDefault(require("../db"));
const getCurrentEmployee = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const result = await db_1.default.query(`SELECT id, employee_id, full_name, email, phone, department, designation, role,
       date_of_joining, is_active, created_at
       FROM users WHERE id = $1`, [req.user.userId]);
        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: 'Employee not found' });
            return;
        }
        const employee = result.rows[0];
        res.json({
            success: true,
            data: {
                id: employee.id,
                employeeId: employee.employee_id,
                fullName: employee.full_name,
                email: employee.email,
                phone: employee.phone,
                department: employee.department,
                designation: employee.designation,
                role: employee.role,
                dateOfJoining: employee.date_of_joining,
                isActive: employee.is_active,
                createdAt: employee.created_at,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.getCurrentEmployee = getCurrentEmployee;
const updateCurrentEmployee = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const { phone, emergencyContactName, emergencyContactPhone, } = req.body;
        const updates = [];
        const values = [];
        let paramCount = 1;
        if (phone !== undefined) {
            updates.push(`phone = $${paramCount}`);
            values.push(phone);
            paramCount++;
        }
        if (emergencyContactName !== undefined) {
            updates.push(`emergency_contact_name = $${paramCount}`);
            values.push(emergencyContactName);
            paramCount++;
        }
        if (emergencyContactPhone !== undefined) {
            updates.push(`emergency_contact_phone = $${paramCount}`);
            values.push(emergencyContactPhone);
            paramCount++;
        }
        if (updates.length === 0) {
            res.status(400).json({ success: false, error: 'No fields to update' });
            return;
        }
        updates.push(`updated_at = NOW()`);
        values.push(req.user.userId);
        const query = `
      UPDATE users SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, employee_id, full_name, email, phone, department, designation, role,
       profile_photo_url, date_of_joining, iqama_number, iqama_expiry, nationality,
       emergency_contact_name, emergency_contact_phone, is_active, created_at
    `;
        const result = await db_1.default.query(query, values);
        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: 'Employee not found' });
            return;
        }
        const employee = result.rows[0];
        res.json({
            success: true,
            data: {
                id: employee.id,
                employeeId: employee.employee_id,
                fullName: employee.full_name,
                email: employee.email,
                phone: employee.phone,
                department: employee.department,
                designation: employee.designation,
                role: employee.role,
                profilePhotoUrl: employee.profile_photo_url,
                dateOfJoining: employee.date_of_joining,
                iqamaNumber: employee.iqama_number,
                iqamaExpiry: employee.iqama_expiry,
                nationality: employee.nationality,
                emergencyContactName: employee.emergency_contact_name,
                emergencyContactPhone: employee.emergency_contact_phone,
                isActive: employee.is_active,
                createdAt: employee.created_at,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.updateCurrentEmployee = updateCurrentEmployee;
const uploadProfilePhoto = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const file = req.file;
        if (!file) {
            res.status(400).json({ success: false, error: 'Profile photo is required' });
            return;
        }
        const photoUrl = `/${file.path.replace(/\\/g, '/')}`;
        const result = await db_1.default.query('UPDATE users SET profile_photo_url = $1, updated_at = NOW() WHERE id = $2 RETURNING profile_photo_url', [photoUrl, req.user.userId]);
        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: 'Employee not found' });
            return;
        }
        res.json({
            success: true,
            data: {
                profilePhotoUrl: result.rows[0].profile_photo_url,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.uploadProfilePhoto = uploadProfilePhoto;
const getAllEmployees = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const department = req.query.department;
        const isActive = req.query.isActive;
        let query = `
      SELECT id, employee_id, full_name, email, phone, department, designation, role,
       date_of_joining, is_active, created_at
      FROM users
      WHERE 1=1
    `;
        const params = [];
        let paramCount = 1;
        if (department) {
            query += ` AND department = $${paramCount}`;
            params.push(department);
            paramCount++;
        }
        if (isActive !== undefined) {
            query += ` AND is_active = $${paramCount}`;
            params.push(isActive === 'true');
            paramCount++;
        }
        query += ' ORDER BY full_name ASC';
        const result = await db_1.default.query(query, params);
        res.json({
            success: true,
            data: {
                employees: result.rows.map((emp) => ({
                    id: emp.id,
                    employeeId: emp.employee_id,
                    fullName: emp.full_name,
                    email: emp.email,
                    phone: emp.phone,
                    department: emp.department,
                    designation: emp.designation,
                    role: emp.role,
                    dateOfJoining: emp.date_of_joining,
                    isActive: emp.is_active,
                    createdAt: emp.created_at,
                })),
                total: result.rows.length,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.getAllEmployees = getAllEmployees;
const createEmployee = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const { employeeId = req.body.employee_id, fullName = req.body.full_name, email, password, phone, department, designation, role, dateOfJoining = req.body.date_of_joining, iqamaNumber = req.body.iqama_number, iqamaExpiry = req.body.iqama_expiry, nationality, } = req.body;
        if (!employeeId || !fullName || !email || !password) {
            res.status(400).json({
                success: false,
                error: 'Employee ID, full name, email, and password are required',
            });
            return;
        }
        const existingEmployee = await db_1.default.query('SELECT id FROM users WHERE employee_id = $1 OR email = $2', [employeeId, email]);
        if (existingEmployee.rows.length > 0) {
            res.status(400).json({
                success: false,
                error: 'Employee ID or email already exists',
            });
            return;
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const result = await db_1.default.query(`INSERT INTO users (employee_id, full_name, email, password_hash, phone, department,
       designation, role, date_of_joining, iqama_number, iqama_expiry, nationality)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, employee_id, full_name, email, phone, department, designation, role,
       date_of_joining, iqama_number, iqama_expiry, nationality, is_active, created_at`, [
            employeeId,
            fullName,
            email,
            passwordHash,
            phone || null,
            department || null,
            designation || null,
            role || 'employee',
            dateOfJoining || null,
            iqamaNumber || null,
            iqamaExpiry || null,
            nationality || null,
        ]);
        const employee = result.rows[0];
        res.status(201).json({
            success: true,
            data: {
                id: employee.id,
                employeeId: employee.employee_id,
                fullName: employee.full_name,
                email: employee.email,
                phone: employee.phone,
                department: employee.department,
                designation: employee.designation,
                role: employee.role,
                dateOfJoining: employee.date_of_joining,
                iqamaNumber: employee.iqama_number,
                iqamaExpiry: employee.iqama_expiry,
                nationality: employee.nationality,
                isActive: employee.is_active,
                createdAt: employee.created_at,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.createEmployee = createEmployee;
const getEmployeeById = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const employeeId = parseInt(req.params.id);
        if (isNaN(employeeId)) {
            res.status(400).json({ success: false, error: 'Invalid employee ID' });
            return;
        }
        const result = await db_1.default.query(`SELECT id, employee_id, full_name, email, phone, department, designation, role,
       profile_photo_url, date_of_joining, iqama_number, iqama_expiry, nationality,
       emergency_contact_name, emergency_contact_phone, is_active, created_at
       FROM users WHERE id = $1`, [employeeId]);
        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: 'Employee not found' });
            return;
        }
        const employee = result.rows[0];
        res.json({
            success: true,
            data: {
                id: employee.id,
                employeeId: employee.employee_id,
                fullName: employee.full_name,
                email: employee.email,
                phone: employee.phone,
                department: employee.department,
                designation: employee.designation,
                role: employee.role,
                profilePhotoUrl: employee.profile_photo_url,
                dateOfJoining: employee.date_of_joining,
                iqamaNumber: employee.iqama_number,
                iqamaExpiry: employee.iqama_expiry,
                nationality: employee.nationality,
                emergencyContactName: employee.emergency_contact_name,
                emergencyContactPhone: employee.emergency_contact_phone,
                isActive: employee.is_active,
                createdAt: employee.created_at,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.getEmployeeById = getEmployeeById;
const updateEmployee = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const employeeId = parseInt(req.params.id);
        if (isNaN(employeeId)) {
            res.status(400).json({ success: false, error: 'Invalid employee ID' });
            return;
        }
        const { fullName, email, phone, department, designation, role, dateOfJoining, iqamaNumber, iqamaExpiry, nationality, emergencyContactName, emergencyContactPhone, } = req.body;
        const updates = [];
        const values = [];
        let paramCount = 1;
        if (fullName !== undefined) {
            updates.push(`full_name = $${paramCount}`);
            values.push(fullName);
            paramCount++;
        }
        if (email !== undefined) {
            updates.push(`email = $${paramCount}`);
            values.push(email);
            paramCount++;
        }
        if (phone !== undefined) {
            updates.push(`phone = $${paramCount}`);
            values.push(phone);
            paramCount++;
        }
        if (department !== undefined) {
            updates.push(`department = $${paramCount}`);
            values.push(department);
            paramCount++;
        }
        if (designation !== undefined) {
            updates.push(`designation = $${paramCount}`);
            values.push(designation);
            paramCount++;
        }
        if (role !== undefined) {
            updates.push(`role = $${paramCount}`);
            values.push(role);
            paramCount++;
        }
        if (dateOfJoining !== undefined) {
            updates.push(`date_of_joining = $${paramCount}`);
            values.push(dateOfJoining);
            paramCount++;
        }
        if (iqamaNumber !== undefined) {
            updates.push(`iqama_number = $${paramCount}`);
            values.push(iqamaNumber);
            paramCount++;
        }
        if (iqamaExpiry !== undefined) {
            updates.push(`iqama_expiry = $${paramCount}`);
            values.push(iqamaExpiry);
            paramCount++;
        }
        if (nationality !== undefined) {
            updates.push(`nationality = $${paramCount}`);
            values.push(nationality);
            paramCount++;
        }
        if (emergencyContactName !== undefined) {
            updates.push(`emergency_contact_name = $${paramCount}`);
            values.push(emergencyContactName);
            paramCount++;
        }
        if (emergencyContactPhone !== undefined) {
            updates.push(`emergency_contact_phone = $${paramCount}`);
            values.push(emergencyContactPhone);
            paramCount++;
        }
        if (updates.length === 0) {
            res.status(400).json({ success: false, error: 'No fields to update' });
            return;
        }
        updates.push(`updated_at = NOW()`);
        values.push(employeeId);
        const query = `
      UPDATE users SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, employee_id, full_name, email, phone, department, designation, role,
       profile_photo_url, date_of_joining, iqama_number, iqama_expiry, nationality,
       emergency_contact_name, emergency_contact_phone, is_active, created_at
    `;
        const result = await db_1.default.query(query, values);
        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: 'Employee not found' });
            return;
        }
        const employee = result.rows[0];
        res.json({
            success: true,
            data: {
                id: employee.id,
                employeeId: employee.employee_id,
                fullName: employee.full_name,
                email: employee.email,
                phone: employee.phone,
                department: employee.department,
                designation: employee.designation,
                role: employee.role,
                profilePhotoUrl: employee.profile_photo_url,
                dateOfJoining: employee.date_of_joining,
                iqamaNumber: employee.iqama_number,
                iqamaExpiry: employee.iqama_expiry,
                nationality: employee.nationality,
                emergencyContactName: employee.emergency_contact_name,
                emergencyContactPhone: employee.emergency_contact_phone,
                isActive: employee.is_active,
                createdAt: employee.created_at,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.updateEmployee = updateEmployee;
const deleteEmployee = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const employeeId = parseInt(req.params.id);
        if (isNaN(employeeId)) {
            res.status(400).json({ success: false, error: 'Invalid employee ID' });
            return;
        }
        const result = await db_1.default.query('UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id', [employeeId]);
        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: 'Employee not found' });
            return;
        }
        res.json({
            success: true,
            data: {
                message: 'Employee deactivated successfully',
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.deleteEmployee = deleteEmployee;
//# sourceMappingURL=employeeController.js.map
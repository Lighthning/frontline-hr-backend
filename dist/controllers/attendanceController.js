"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyPolicy = exports.getGeofence = exports.getAttendanceReport = exports.getAllAttendance = exports.getAttendanceStatus = exports.getAttendanceHistory = exports.getTodayAttendance = exports.checkOut = exports.checkIn = void 0;
const db_1 = __importDefault(require("../db"));
const geofence_1 = require("../middleware/geofence");
const distance_1 = require("../utils/distance");
const LATE_TIME_THRESHOLD = 9.5; // 9:30 AM in decimal hours
const HALF_DAY_HOURS = 4;
const calculateTotalHours = (checkIn, checkOut) => {
    const diff = checkOut.getTime() - checkIn.getTime();
    return Math.round((diff / (1000 * 60 * 60)) * 100) / 100;
};
const determineStatus = (checkInTime, totalHours) => {
    const checkInHour = checkInTime.getHours() + checkInTime.getMinutes() / 60;
    if (checkInHour > LATE_TIME_THRESHOLD) {
        return 'late';
    }
    if (totalHours && totalHours < HALF_DAY_HOURS) {
        return 'half_day';
    }
    return 'present';
};
const checkIn = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const userId = req.user.userId;
        const { latitude, longitude } = req.body;
        const file = req.file;
        // Debug logging
        console.log('[CheckIn] Received request - userId:', userId);
        console.log('[CheckIn] req.body:', JSON.stringify(req.body));
        console.log('[CheckIn] latitude:', latitude, 'type:', typeof latitude);
        console.log('[CheckIn] longitude:', longitude, 'type:', typeof longitude);
        console.log('[CheckIn] file:', file ? file.filename : 'NO FILE');
        // Fetch employee's attendance policy
        const policyResult = await db_1.default.query('SELECT * FROM employee_attendance_policy WHERE user_id = $1', [userId]);
        const policy = policyResult.rows[0] || {
            geofence_override: 'office',
            photo_required: true,
            allow_remote: false,
        };
        // Photo check — if policy says photo not required, skip photo validation
        const photoRequired = policy.photo_required;
        if (photoRequired && !file) {
            res.status(400).json({ success: false, error: 'Photo is required for check-in.' });
            return;
        }
        if (!latitude || !longitude) {
            res.status(400).json({ success: false, error: 'GPS coordinates are required' });
            return;
        }
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        if (isNaN(lat) || isNaN(lng)) {
            res.status(400).json({ success: false, error: 'Invalid GPS coordinates' });
            return;
        }
        const today = new Date().toISOString().split('T')[0];
        const existing = await db_1.default.query('SELECT id FROM attendance WHERE user_id = $1 AND date = $2', [userId, today]);
        if (existing.rows.length > 0) {
            res.status(400).json({ success: false, error: 'Already checked in today' });
            return;
        }
        // Geofence check — based on policy override
        let withinGeofence = false;
        let geofenceWarning = null;
        if (policy.geofence_override === 'remote') {
            // Remote worker — no geofence check needed
            withinGeofence = true;
            geofenceWarning = null;
        }
        else if (policy.geofence_override === 'any') {
            // Check against ANY active geofence
            const allGeofences = await db_1.default.query('SELECT * FROM geofence_locations WHERE is_active = true');
            for (const gf of allGeofences.rows) {
                const dist = (0, distance_1.calculateDistance)(lat, lng, parseFloat(gf.latitude), parseFloat(gf.longitude));
                if (dist <= gf.radius_meters) {
                    withinGeofence = true;
                    break;
                }
            }
            if (!withinGeofence) {
                geofenceWarning = 'Outside all office locations.';
            }
        }
        else if (policy.geofence_override === 'custom') {
            // Check against specific allowed geofences
            if (policy.custom_geofence_ids?.length > 0) {
                const customGf = await db_1.default.query('SELECT * FROM geofence_locations WHERE id = ANY($1) AND is_active = true', [policy.custom_geofence_ids]);
                for (const gf of customGf.rows) {
                    const dist = (0, distance_1.calculateDistance)(lat, lng, parseFloat(gf.latitude), parseFloat(gf.longitude));
                    if (dist <= gf.radius_meters) {
                        withinGeofence = true;
                        break;
                    }
                }
            }
            if (!withinGeofence) {
                geofenceWarning = 'Outside your assigned office locations.';
            }
        }
        else {
            // Default 'office' — check against primary active geofence
            withinGeofence = await (0, geofence_1.validateGeofence)(lat, lng);
            if (!withinGeofence) {
                geofenceWarning = 'You must be within the office area to check in.';
            }
        }
        // Block check-in if outside geofence AND not remote
        const isBlocked = !withinGeofence && !policy.allow_remote && policy.geofence_override !== 'remote';
        if (isBlocked) {
            res.status(403).json({
                success: false,
                error: geofenceWarning || 'You must be within the office area to check in.',
                code: 'OUTSIDE_GEOFENCE',
            });
            return;
        }
        const photoUrl = file?.filename ? `/uploads/${file.filename}` : null;
        const checkInTime = new Date();
        const status = determineStatus(checkInTime, null);
        const result = await db_1.default.query(`INSERT INTO attendance (user_id, date, check_in_time, check_in_photo_url,
       check_in_lat, check_in_lng, check_in_within_geofence, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`, [userId, today, checkInTime, photoUrl, lat, lng, withinGeofence, status]);
        res.json({
            success: true,
            data: {
                id: result.rows[0].id,
                checkInTime: result.rows[0].check_in_time,
                withinGeofence,
                status,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.checkIn = checkIn;
const checkOut = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const userId = req.user.userId;
        const { latitude, longitude } = req.body;
        const file = req.file;
        // Fetch employee's attendance policy
        const policyResult = await db_1.default.query('SELECT * FROM employee_attendance_policy WHERE user_id = $1', [userId]);
        const policy = policyResult.rows[0] || {
            geofence_override: 'office',
            photo_required: true,
            allow_remote: false,
        };
        // Photo check — if policy says photo not required, skip photo validation
        const photoRequired = policy.photo_required;
        if (photoRequired && !file) {
            res.status(400).json({ success: false, error: 'Photo is required for check-out.' });
            return;
        }
        if (!latitude || !longitude) {
            res.status(400).json({ success: false, error: 'GPS coordinates are required' });
            return;
        }
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        if (isNaN(lat) || isNaN(lng)) {
            res.status(400).json({ success: false, error: 'Invalid GPS coordinates' });
            return;
        }
        const today = new Date().toISOString().split('T')[0];
        const existing = await db_1.default.query('SELECT * FROM attendance WHERE user_id = $1 AND date = $2', [userId, today]);
        if (existing.rows.length === 0) {
            res.status(400).json({ success: false, error: 'No check-in record found for today' });
            return;
        }
        const attendance = existing.rows[0];
        if (attendance.check_out_time) {
            res.status(400).json({ success: false, error: 'Already checked out today' });
            return;
        }
        // Geofence check — based on policy override (same logic as check-in)
        let withinGeofence = false;
        if (policy.geofence_override === 'remote') {
            withinGeofence = true;
        }
        else if (policy.geofence_override === 'any') {
            const allGeofences = await db_1.default.query('SELECT * FROM geofence_locations WHERE is_active = true');
            for (const gf of allGeofences.rows) {
                const dist = (0, distance_1.calculateDistance)(lat, lng, parseFloat(gf.latitude), parseFloat(gf.longitude));
                if (dist <= gf.radius_meters) {
                    withinGeofence = true;
                    break;
                }
            }
        }
        else if (policy.geofence_override === 'custom') {
            if (policy.custom_geofence_ids?.length > 0) {
                const customGf = await db_1.default.query('SELECT * FROM geofence_locations WHERE id = ANY($1) AND is_active = true', [policy.custom_geofence_ids]);
                for (const gf of customGf.rows) {
                    const dist = (0, distance_1.calculateDistance)(lat, lng, parseFloat(gf.latitude), parseFloat(gf.longitude));
                    if (dist <= gf.radius_meters) {
                        withinGeofence = true;
                        break;
                    }
                }
            }
        }
        else {
            withinGeofence = await (0, geofence_1.validateGeofence)(lat, lng);
        }
        const photoUrl = file?.filename ? `/uploads/${file.filename}` : null;
        const checkOutTime = new Date();
        const checkInTime = new Date(attendance.check_in_time);
        const totalHours = calculateTotalHours(checkInTime, checkOutTime);
        const status = determineStatus(checkInTime, totalHours);
        const result = await db_1.default.query(`UPDATE attendance SET check_out_time = $1, check_out_photo_url = $2,
       check_out_lat = $3, check_out_lng = $4, check_out_within_geofence = $5,
       total_hours = $6, status = $7
       WHERE id = $8
       RETURNING *`, [checkOutTime, photoUrl, lat, lng, withinGeofence, totalHours, status, attendance.id]);
        res.json({
            success: true,
            data: {
                id: result.rows[0].id,
                checkOutTime: result.rows[0].check_out_time,
                totalHours,
                withinGeofence,
                status,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.checkOut = checkOut;
const getTodayAttendance = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const today = new Date().toISOString().split('T')[0];
        const result = await db_1.default.query('SELECT * FROM attendance WHERE user_id = $1 AND date = $2', [req.user.userId, today]);
        if (result.rows.length === 0) {
            res.json({ success: true, data: null });
            return;
        }
        const attendance = result.rows[0];
        res.json({
            success: true,
            data: {
                id: attendance.id,
                date: attendance.date,
                checkInTime: attendance.check_in_time,
                checkInPhotoUrl: attendance.check_in_photo_url,
                checkInWithinGeofence: attendance.check_in_within_geofence,
                checkOutTime: attendance.check_out_time,
                checkOutPhotoUrl: attendance.check_out_photo_url,
                checkOutWithinGeofence: attendance.check_out_within_geofence,
                totalHours: attendance.total_hours,
                status: attendance.status,
                notes: attendance.notes,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.getTodayAttendance = getTodayAttendance;
const getAttendanceHistory = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 30;
        const offset = (page - 1) * limit;
        const month = req.query.month; // Format: YYYY-MM
        // Build WHERE clause with optional month filter
        let whereClause = 'WHERE user_id = $1';
        const params = [req.user.userId];
        if (month && /^\d{4}-\d{2}$/.test(month)) {
            // Month filter: match YYYY-MM from date field
            params.push(month + '%');
            whereClause += ` AND date::text LIKE $${params.length}`;
        }
        const result = await db_1.default.query(`SELECT * FROM attendance ${whereClause}
       ORDER BY date DESC, check_in_time DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]);
        const countResult = await db_1.default.query(`SELECT COUNT(*) FROM attendance ${whereClause}`, params);
        const total = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(total / limit);
        res.json({
            success: true,
            data: {
                records: result.rows.map((att) => ({
                    id: att.id,
                    date: att.date,
                    checkInTime: att.check_in_time,
                    checkInPhotoUrl: att.check_in_photo_url,
                    checkInWithinGeofence: att.check_in_within_geofence,
                    checkOutTime: att.check_out_time,
                    checkOutPhotoUrl: att.check_out_photo_url,
                    checkOutWithinGeofence: att.check_out_within_geofence,
                    totalHours: att.total_hours,
                    status: att.status,
                    notes: att.notes,
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                },
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.getAttendanceHistory = getAttendanceHistory;
const getAttendanceStatus = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const today = new Date().toISOString().split('T')[0];
        const result = await db_1.default.query('SELECT check_in_time, check_out_time FROM attendance WHERE user_id = $1 AND date = $2', [req.user.userId, today]);
        const isCheckedIn = result.rows.length > 0;
        const isCheckedOut = isCheckedIn && result.rows[0].check_out_time !== null;
        res.json({
            success: true,
            data: {
                isCheckedIn,
                isCheckedOut,
                checkInTime: isCheckedIn ? result.rows[0].check_in_time : null,
                checkOutTime: isCheckedOut ? result.rows[0].check_out_time : null,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.getAttendanceStatus = getAttendanceStatus;
const getAllAttendance = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const date = req.query.date;
        const department = req.query.department;
        const status = req.query.status;
        let query = `
      SELECT a.*, u.employee_id, u.full_name, u.department, u.designation
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
        const params = [];
        let paramIdx = 1;
        if (date) {
            query += ` AND a.date = $${paramIdx}`;
            params.push(date);
            paramIdx++;
        }
        if (department) {
            query += ` AND u.department = $${paramIdx}`;
            params.push(department);
            paramIdx++;
        }
        if (status) {
            query += ` AND a.status = $${paramIdx}`;
            params.push(status);
            paramIdx++;
        }
        query += ` ORDER BY a.date DESC, a.check_in_time DESC NULLS LAST`;
        const result = await db_1.default.query(query, params);
        res.json({
            success: true,
            data: {
                records: result.rows.map((att) => ({
                    id: att.id,
                    userId: att.user_id,
                    employeeId: att.employee_id,
                    fullName: att.full_name,
                    department: att.department,
                    designation: att.designation,
                    date: att.date,
                    checkInTime: att.check_in_time,
                    checkInPhotoUrl: att.check_in_photo_url,
                    checkInLat: att.check_in_lat,
                    checkInLng: att.check_in_lng,
                    checkInWithinGeofence: att.check_in_within_geofence,
                    checkOutTime: att.check_out_time,
                    checkOutPhotoUrl: att.check_out_photo_url,
                    checkOutLat: att.check_out_lat,
                    checkOutLng: att.check_out_lng,
                    checkOutWithinGeofence: att.check_out_within_geofence,
                    totalHours: att.total_hours,
                    status: att.status,
                })),
                total: result.rows.length,
                date: date || null,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.getAllAttendance = getAllAttendance;
const getAttendanceReport = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const department = req.query.department;
        const status = req.query.status;
        let query = `
      SELECT a.*, u.employee_id, u.full_name, u.department, u.designation
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
        const params = [];
        let paramCount = 1;
        if (startDate) {
            query += ` AND a.date >= $${paramCount}`;
            params.push(startDate);
            paramCount++;
        }
        if (endDate) {
            query += ` AND a.date <= $${paramCount}`;
            params.push(endDate);
            paramCount++;
        }
        if (department) {
            query += ` AND u.department = $${paramCount}`;
            params.push(department);
            paramCount++;
        }
        if (status) {
            query += ` AND a.status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }
        query += ' ORDER BY a.date DESC, a.check_in_time DESC';
        const result = await db_1.default.query(query, params);
        res.json({
            success: true,
            data: {
                records: result.rows.map((att) => ({
                    id: att.id,
                    userId: att.user_id,
                    employeeId: att.employee_id,
                    fullName: att.full_name,
                    department: att.department,
                    designation: att.designation,
                    date: att.date,
                    checkInTime: att.check_in_time,
                    checkInWithinGeofence: att.check_in_within_geofence,
                    checkOutTime: att.check_out_time,
                    checkOutWithinGeofence: att.check_out_within_geofence,
                    totalHours: att.total_hours,
                    status: att.status,
                })),
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.getAttendanceReport = getAttendanceReport;
const getGeofence = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const result = await db_1.default.query('SELECT * FROM geofence_locations WHERE is_active = true ORDER BY id ASC LIMIT 1');
        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: 'No active geofence location found' });
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
                radius_meters: location.radius_meters,
                radiusMeters: location.radius_meters,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.getGeofence = getGeofence;
const getMyPolicy = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Authentication required' });
            return;
        }
        const userId = req.user.userId;
        const [policyResult, geofencesResult] = await Promise.all([
            db_1.default.query('SELECT * FROM employee_attendance_policy WHERE user_id = $1', [userId]),
            db_1.default.query('SELECT * FROM geofence_locations WHERE is_active = true ORDER BY id ASC'),
        ]);
        const policy = policyResult.rows[0] || {
            geofence_override: 'office',
            photo_required: true,
            allow_remote: false,
            work_start_time: '09:00:00',
            work_end_time: '17:00:00',
            work_days: [0, 1, 2, 3, 4],
        };
        // Build list of allowed geofences based on policy
        let allowedGeofences = [];
        if (policy.geofence_override === 'remote') {
            allowedGeofences = []; // No geofence needed
        }
        else if (policy.geofence_override === 'any') {
            allowedGeofences = geofencesResult.rows.map((g) => ({
                id: g.id,
                name: g.name,
                latitude: parseFloat(g.latitude),
                longitude: parseFloat(g.longitude),
                radius_meters: g.radius_meters,
            }));
        }
        else if (policy.geofence_override === 'custom' && policy.custom_geofence_ids?.length > 0) {
            allowedGeofences = geofencesResult.rows
                .filter((g) => policy.custom_geofence_ids.includes(g.id))
                .map((g) => ({
                id: g.id,
                name: g.name,
                latitude: parseFloat(g.latitude),
                longitude: parseFloat(g.longitude),
                radius_meters: g.radius_meters,
            }));
        }
        else {
            // Default: primary (first) geofence
            allowedGeofences = geofencesResult.rows.slice(0, 1).map((g) => ({
                id: g.id,
                name: g.name,
                latitude: parseFloat(g.latitude),
                longitude: parseFloat(g.longitude),
                radius_meters: g.radius_meters,
            }));
        }
        res.json({
            success: true,
            data: {
                geofenceOverride: policy.geofence_override,
                photoRequired: policy.photo_required,
                allowRemote: policy.allow_remote,
                remoteReason: policy.remote_reason,
                enforceCheckInTime: policy.enforce_check_in_time,
                checkInWindowStart: policy.check_in_window_start,
                checkInWindowEnd: policy.check_in_window_end,
                workStartTime: policy.work_start_time,
                workEndTime: policy.work_end_time,
                workDays: policy.work_days,
                gracePeriodMinutes: policy.grace_period_minutes,
                allowedGeofences,
                isRemoteWorker: policy.geofence_override === 'remote' || policy.allow_remote,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch policy.' });
    }
};
exports.getMyPolicy = getMyPolicy;
//# sourceMappingURL=attendanceController.js.map
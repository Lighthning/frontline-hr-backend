"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetToDefault = exports.updateGeofence = exports.createGeofence = exports.getAllGeofences = exports.updateEmployeePolicy = exports.getEmployeePolicy = void 0;
const db_1 = __importDefault(require("../db"));
// ─── GET EMPLOYEE POLICY ─────────────────────────────────────
const getEmployeePolicy = async (req, res) => {
    try {
        const { userId } = req.params;
        const targetId = parseInt(userId);
        const result = await db_1.default.query(`SELECT
        p.*,
        u.full_name, u.employee_id, u.email, u.department, u.designation,
        COALESCE(
          (SELECT json_agg(gl.*)
           FROM geofence_locations gl
           WHERE gl.id = ANY(p.custom_geofence_ids) AND gl.is_active = true),
          '[]'
        ) as custom_geofences
       FROM employee_attendance_policy p
       JOIN users u ON p.user_id = u.id
       WHERE p.user_id = $1`, [targetId]);
        if (result.rows.length === 0) {
            // No policy yet — create default and return
            const insertResult = await db_1.default.query(`INSERT INTO employee_attendance_policy (
          user_id, work_start_time, work_end_time, work_days,
          enforce_check_in_time, check_in_window_start, check_in_window_end
        )
         VALUES ($1, '09:00:00', '17:00:00', '{0,1,2,3,4}', true, '09:00:00', '09:30:00')
         ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
         RETURNING *`, [targetId]);
            res.json({ success: true, data: { ...insertResult.rows[0], custom_geofences: [] } });
            return;
        }
        res.json({ success: true, data: result.rows[0] });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch employee policy.' });
    }
};
exports.getEmployeePolicy = getEmployeePolicy;
// ─── UPDATE EMPLOYEE POLICY ──────────────────────────────────
const updateEmployeePolicy = async (req, res) => {
    try {
        const { userId } = req.params;
        const targetId = parseInt(userId);
        console.log('[POLICY DEBUG] Received request to update policy for userId:', userId);
        console.log('[POLICY DEBUG] Request body:', JSON.stringify(req.body, null, 2));
        const { geofenceOverride, customGeofenceIds, photoRequired, allowRemote, remoteReason, enforceCheckInTime, checkInWindowStart, checkInWindowEnd, checkOutWindowStart, checkOutWindowEnd, workStartTime, workEndTime, workDays, gracePeriodMinutes, latePenaltyMinutes, policyNotes, } = req.body;
        // Validate geofenceOverride value
        const validOverrides = ['office', 'any', 'remote', 'custom'];
        if (geofenceOverride && !validOverrides.includes(geofenceOverride)) {
            res.status(400).json({
                success: false,
                error: `Invalid geofenceOverride. Must be one of: ${validOverrides.join(', ')}`,
            });
            return;
        }
        // If custom, validate geofence IDs exist
        if (geofenceOverride === 'custom' && customGeofenceIds?.length > 0) {
            const gfCheck = await db_1.default.query('SELECT id FROM geofence_locations WHERE id = ANY($1) AND is_active = true', [customGeofenceIds]);
            if (gfCheck.rows.length !== customGeofenceIds.length) {
                res.status(400).json({
                    success: false,
                    error: 'One or more custom geofence IDs are invalid or inactive.',
                });
                return;
            }
        }
        const result = await db_1.default.query(`INSERT INTO employee_attendance_policy (
        user_id, geofence_override, custom_geofence_ids, photo_required,
        allow_remote, remote_reason, enforce_check_in_time,
        check_in_window_start, check_in_window_end,
        check_out_window_start, check_out_window_end,
        work_start_time, work_end_time, work_days, grace_period_minutes,
        late_penalty_minutes, policy_notes, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        geofence_override = EXCLUDED.geofence_override,
        custom_geofence_ids = EXCLUDED.custom_geofence_ids,
        photo_required = EXCLUDED.photo_required,
        allow_remote = EXCLUDED.allow_remote,
        remote_reason = EXCLUDED.remote_reason,
        enforce_check_in_time = EXCLUDED.enforce_check_in_time,
        check_in_window_start = EXCLUDED.check_in_window_start,
        check_in_window_end = EXCLUDED.check_in_window_end,
        check_out_window_start = EXCLUDED.check_out_window_start,
        check_out_window_end = EXCLUDED.check_out_window_end,
        work_start_time = EXCLUDED.work_start_time,
        work_end_time = EXCLUDED.work_end_time,
        work_days = EXCLUDED.work_days,
        grace_period_minutes = EXCLUDED.grace_period_minutes,
        late_penalty_minutes = EXCLUDED.late_penalty_minutes,
        policy_notes = EXCLUDED.policy_notes,
        updated_at = NOW()
      RETURNING *`, [
            targetId,
            geofenceOverride || 'office',
            customGeofenceIds || [],
            photoRequired !== undefined ? photoRequired : true,
            allowRemote || false,
            remoteReason || null,
            enforceCheckInTime || false,
            checkInWindowStart || '07:00:00',
            checkInWindowEnd || '12:00:00',
            checkOutWindowStart || '14:00:00',
            checkOutWindowEnd || '23:59:59',
            workStartTime || '09:00:00',
            workEndTime || '17:00:00',
            workDays || [0, 1, 2, 3, 4],
            gracePeriodMinutes || 0,
            latePenaltyMinutes !== undefined ? latePenaltyMinutes : 0,
            policyNotes || null,
        ]);
        console.log('[POLICY DEBUG] Successfully updated policy:', result.rows[0]);
        res.json({
            success: true,
            message: 'Employee attendance policy updated.',
            data: result.rows[0],
        });
    }
    catch (error) {
        console.error('[POLICY ERROR] Failed to update employee policy:', error);
        console.error('[POLICY ERROR] Error details:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            error: 'Failed to update employee policy.',
            details: error instanceof Error ? error.message : String(error)
        });
    }
};
exports.updateEmployeePolicy = updateEmployeePolicy;
// ─── GET ALL GEOFENCE LOCATIONS (for dropdowns) ──────────────
const getAllGeofences = async (req, res) => {
    try {
        const result = await db_1.default.query(`SELECT id, name, latitude, longitude, radius_meters, address, branch_code, is_active
       FROM geofence_locations
       ORDER BY is_active DESC, name ASC`);
        res.json({ success: true, data: result.rows });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch geofences.' });
    }
};
exports.getAllGeofences = getAllGeofences;
// ─── CREATE NEW BRANCH / GEOFENCE ───────────────────────────
const createGeofence = async (req, res) => {
    try {
        const { name, latitude, longitude, radiusMeters, address, branchCode } = req.body;
        if (!name || !latitude || !longitude) {
            res.status(400).json({ success: false, error: 'name, latitude, longitude are required.' });
            return;
        }
        const result = await db_1.default.query(`INSERT INTO geofence_locations (name, latitude, longitude, radius_meters, address, branch_code, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, true, $7)
       RETURNING *`, [
            name.trim(),
            parseFloat(latitude),
            parseFloat(longitude),
            parseInt(radiusMeters) || 200,
            address?.trim() || null,
            branchCode?.trim()?.toUpperCase() || null,
            req.user?.userId,
        ]);
        res.status(201).json({ success: true, data: result.rows[0] });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to create geofence.' });
    }
};
exports.createGeofence = createGeofence;
// ─── UPDATE GEOFENCE ─────────────────────────────────────────
const updateGeofence = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, latitude, longitude, radiusMeters, address, branchCode, isActive } = req.body;
        const result = await db_1.default.query(`UPDATE geofence_locations
       SET name = COALESCE($1, name),
           latitude = COALESCE($2, latitude),
           longitude = COALESCE($3, longitude),
           radius_meters = COALESCE($4, radius_meters),
           address = COALESCE($5, address),
           branch_code = COALESCE($6, branch_code),
           is_active = COALESCE($7, is_active)
       WHERE id = $8
       RETURNING *`, [
            name?.trim() || null,
            latitude ? parseFloat(latitude) : null,
            longitude ? parseFloat(longitude) : null,
            radiusMeters ? parseInt(radiusMeters) : null,
            address?.trim() || null,
            branchCode?.trim()?.toUpperCase() || null,
            isActive !== undefined ? isActive : null,
            parseInt(id),
        ]);
        if (result.rows.length === 0) {
            res.status(404).json({ success: false, error: 'Geofence not found.' });
            return;
        }
        res.json({ success: true, data: result.rows[0] });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update geofence.' });
    }
};
exports.updateGeofence = updateGeofence;
// ─── RESET EMPLOYEE POLICY TO DEFAULT ───────────────────────
const resetToDefault = async (req, res) => {
    try {
        const { userId } = req.params;
        const targetId = parseInt(userId);
        const result = await db_1.default.query(`INSERT INTO employee_attendance_policy (
        user_id, geofence_override, custom_geofence_ids, photo_required,
        allow_remote, enforce_check_in_time,
        check_in_window_start, check_in_window_end,
        check_out_window_start, check_out_window_end,
        work_start_time, work_end_time, work_days,
        updated_at
      ) VALUES ($1, 'office', '{}', true, false, true,
        '09:00:00', '09:30:00', '16:30:00', '17:30:00',
        '09:00:00', '17:00:00', '{0,1,2,3,4}', NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        geofence_override = 'office',
        custom_geofence_ids = '{}',
        photo_required = true,
        allow_remote = false,
        enforce_check_in_time = true,
        check_in_window_start = '09:00:00',
        check_in_window_end = '09:30:00',
        check_out_window_start = '16:30:00',
        check_out_window_end = '17:30:00',
        work_start_time = '09:00:00',
        work_end_time = '17:00:00',
        work_days = '{0,1,2,3,4}',
        grace_period_minutes = 0,
        updated_at = NOW()
      RETURNING *`, [targetId]);
        res.json({ success: true, data: result.rows[0] });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to reset policy.' });
    }
};
exports.resetToDefault = resetToDefault;
//# sourceMappingURL=policyController.js.map
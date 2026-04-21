"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const attendanceController_1 = require("../controllers/attendanceController");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
router.post('/check-in', auth_1.authenticate, upload_1.uploadPhoto.single('photo'), upload_1.compressPhoto, attendanceController_1.checkIn);
router.post('/check-out', auth_1.authenticate, upload_1.uploadPhoto.single('photo'), upload_1.compressPhoto, attendanceController_1.checkOut);
router.get('/today', auth_1.authenticate, attendanceController_1.getTodayAttendance);
router.get('/history', auth_1.authenticate, attendanceController_1.getAttendanceHistory);
router.get('/status', auth_1.authenticate, attendanceController_1.getAttendanceStatus);
router.get('/geofence', auth_1.authenticate, attendanceController_1.getGeofence);
router.get('/my-policy', auth_1.authenticate, attendanceController_1.getMyPolicy);
router.get('/all', auth_1.authenticate, (0, auth_1.requireRole)('admin', 'hr'), attendanceController_1.getAllAttendance);
router.get('/report', auth_1.authenticate, (0, auth_1.requireRole)('admin', 'hr'), attendanceController_1.getAttendanceReport);
exports.default = router;
//# sourceMappingURL=attendance.js.map
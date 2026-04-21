import { Router } from 'express';
import {
  checkIn,
  checkOut,
  getTodayAttendance,
  getAttendanceHistory,
  getAttendanceStatus,
  getAllAttendance,
  getAttendanceReport,
  getGeofence,
  getMyPolicy,
} from '../controllers/attendanceController';
import { authenticate, requireRole } from '../middleware/auth';
import { uploadPhoto, compressPhoto } from '../middleware/upload';

const router = Router();

router.post('/check-in', authenticate, uploadPhoto.single('photo'), compressPhoto, checkIn);
router.post('/check-out', authenticate, uploadPhoto.single('photo'), compressPhoto, checkOut);
router.get('/today', authenticate, getTodayAttendance);
router.get('/history', authenticate, getAttendanceHistory);
router.get('/status', authenticate, getAttendanceStatus);
router.get('/geofence', authenticate, getGeofence);
router.get('/my-policy', authenticate, getMyPolicy);
router.get('/all', authenticate, requireRole('admin', 'hr'), getAllAttendance);
router.get('/report', authenticate, requireRole('admin', 'hr'), getAttendanceReport);

export default router;

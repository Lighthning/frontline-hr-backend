import { Router } from 'express';
import {
  getEmployeePolicy,
  updateEmployeePolicy,
  getAllGeofences,
  createGeofence,
  updateGeofence,
  resetToDefault,
} from '../controllers/policyController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// All routes require auth
router.use(authenticate);

// Geofence locations (branches)
router.get('/geofences', getAllGeofences);
router.post('/geofences', requireRole('admin', 'hr'), createGeofence);
router.put('/geofences/:id', requireRole('admin', 'hr'), updateGeofence);

// Per-employee policy
router.get('/employees/:userId/policy', requireRole('admin', 'hr'), getEmployeePolicy);
router.put('/employees/:userId/policy', requireRole('admin', 'hr'), updateEmployeePolicy);
router.post('/employees/:userId/reset-to-default', requireRole('admin', 'hr'), resetToDefault);

export default router;

import { Router } from 'express';
import {
  getGeofenceLocations,
  updateGeofenceLocation,
  getDashboardStats,
} from '../controllers/adminController';
import { authenticate, requireRole } from '../middleware/auth';
import { getStorageStats } from '../middleware/upload';

const router = Router();

router.get('/geofence', authenticate, requireRole('admin', 'hr'), getGeofenceLocations);
router.put('/geofence/:id', authenticate, requireRole('admin'), updateGeofenceLocation);
router.get('/stats', authenticate, requireRole('admin', 'hr'), getDashboardStats);

// GET /api/admin/storage-stats
router.get('/storage-stats', authenticate, requireRole('admin'), (req, res) => {
  const stats = getStorageStats();
  const memory = process.memoryUsage();
  res.json({
    success: true,
    data: {
      storage: {
        totalFiles: stats.totalFiles,
        totalSizeMB: stats.totalSizeMB,
        estimatedCapacityGB: 5,
        usedPercent: parseFloat(((stats.totalSizeMB / (5 * 1024)) * 100).toFixed(2)),
        oldestFile: stats.oldestFile,
      },
      memory: {
        rssMB: Math.round(memory.rss / 1024 / 1024),
        heapUsedMB: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memory.heapTotal / 1024 / 1024),
      },
    },
  });
});

export default router;

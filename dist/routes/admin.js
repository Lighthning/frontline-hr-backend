"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = require("../controllers/adminController");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
router.get('/geofence', auth_1.authenticate, (0, auth_1.requireRole)('admin', 'hr'), adminController_1.getGeofenceLocations);
router.put('/geofence/:id', auth_1.authenticate, (0, auth_1.requireRole)('admin'), adminController_1.updateGeofenceLocation);
router.get('/stats', auth_1.authenticate, (0, auth_1.requireRole)('admin', 'hr'), adminController_1.getDashboardStats);
router.get('/dashboard', auth_1.authenticate, (0, auth_1.requireRole)('admin', 'hr'), adminController_1.getDashboardStats);
// GET /api/admin/storage-stats
router.get('/storage-stats', auth_1.authenticate, (0, auth_1.requireRole)('admin'), (req, res) => {
    const stats = (0, upload_1.getStorageStats)();
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
exports.default = router;
//# sourceMappingURL=admin.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const policyController_1 = require("../controllers/policyController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All routes require auth
router.use(auth_1.authenticate);
// Geofence locations (branches)
router.get('/geofences', policyController_1.getAllGeofences);
router.post('/geofences', (0, auth_1.requireRole)('admin', 'hr'), policyController_1.createGeofence);
router.put('/geofences/:id', (0, auth_1.requireRole)('admin', 'hr'), policyController_1.updateGeofence);
// Current user's policy
router.get('/my-policy', policyController_1.getMyPolicy);
// Per-employee policy
router.get('/employees/:userId/policy', (0, auth_1.requireRole)('admin', 'hr'), policyController_1.getEmployeePolicy);
router.put('/employees/:userId/policy', (0, auth_1.requireRole)('admin', 'hr'), policyController_1.updateEmployeePolicy);
router.post('/employees/:userId/reset-to-default', (0, auth_1.requireRole)('admin', 'hr'), policyController_1.resetToDefault);
exports.default = router;
//# sourceMappingURL=policy.js.map
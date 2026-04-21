"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const employeeController_1 = require("../controllers/employeeController");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
router.get('/me', auth_1.authenticate, employeeController_1.getCurrentEmployee);
router.put('/me', auth_1.authenticate, employeeController_1.updateCurrentEmployee);
router.post('/me/photo', auth_1.authenticate, upload_1.uploadProfilePhoto.single('photo'), employeeController_1.uploadProfilePhoto);
router.get('/', auth_1.authenticate, (0, auth_1.requireRole)('admin', 'hr'), employeeController_1.getAllEmployees);
router.post('/', auth_1.authenticate, (0, auth_1.requireRole)('admin', 'hr'), employeeController_1.createEmployee);
router.get('/:id', auth_1.authenticate, (0, auth_1.requireRole)('admin', 'hr'), employeeController_1.getEmployeeById);
router.put('/:id', auth_1.authenticate, (0, auth_1.requireRole)('admin', 'hr'), employeeController_1.updateEmployee);
router.delete('/:id', auth_1.authenticate, (0, auth_1.requireRole)('admin'), employeeController_1.deleteEmployee);
exports.default = router;
//# sourceMappingURL=employees.js.map
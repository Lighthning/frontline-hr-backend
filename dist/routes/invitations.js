"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const invitationController_1 = require("../controllers/invitationController");
const router = (0, express_1.Router)();
router.post('/send', auth_1.authenticate, invitationController_1.sendInvitation);
router.get('/validate/:token', invitationController_1.validateInvitation);
router.post('/accept', invitationController_1.acceptInvitation);
router.get('/', auth_1.authenticate, invitationController_1.getAllInvitations);
exports.default = router;
//# sourceMappingURL=invitations.js.map
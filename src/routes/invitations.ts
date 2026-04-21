import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  sendInvitation,
  validateInvitation,
  acceptInvitation,
  getAllInvitations,
} from '../controllers/invitationController';

const router = Router();

router.post('/send', authenticate, sendInvitation);
router.get('/validate/:token', validateInvitation);
router.post('/accept', acceptInvitation);
router.get('/', authenticate, getAllInvitations);

export default router;

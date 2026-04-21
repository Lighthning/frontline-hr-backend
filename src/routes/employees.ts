import { Router } from 'express';
import {
  getCurrentEmployee,
  updateCurrentEmployee,
  uploadProfilePhoto as uploadProfilePhotoController,
  getAllEmployees,
  createEmployee,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} from '../controllers/employeeController';
import { authenticate, requireRole } from '../middleware/auth';
import { uploadProfilePhoto } from '../middleware/upload';

const router = Router();

router.get('/me', authenticate, getCurrentEmployee);
router.put('/me', authenticate, updateCurrentEmployee);
router.post('/me/photo', authenticate, uploadProfilePhoto.single('photo'), uploadProfilePhotoController);

router.get('/', authenticate, requireRole('admin', 'hr'), getAllEmployees);
router.post('/', authenticate, requireRole('admin', 'hr'), createEmployee);
router.get('/:id', authenticate, requireRole('admin', 'hr'), getEmployeeById);
router.put('/:id', authenticate, requireRole('admin', 'hr'), updateEmployee);
router.delete('/:id', authenticate, requireRole('admin'), deleteEmployee);

export default router;

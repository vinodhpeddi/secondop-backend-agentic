import { Router } from 'express';
import {
  getDoctors,
  getDoctorById,
  searchDoctors,
  getDoctorReviews,
  addDoctorReview,
} from '../controllers/doctor.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/', getDoctors);
router.get('/search', searchDoctors);
router.get('/:doctorId', getDoctorById);
router.get('/:doctorId/reviews', getDoctorReviews);

// Protected routes
router.post('/:doctorId/reviews', authenticate, authorize('patient'), addDoctorReview);

export default router;


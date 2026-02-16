import { Router } from 'express';
import {
  createCase,
  getCases,
  getCaseById,
  updateCase,
  deleteCase,
  assignDoctorToCase,
  getDoctorCases,
  updateCaseStatus,
} from '../controllers/case.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Patient routes
router.post('/', authorize('patient'), createCase);
router.get('/my-cases', authorize('patient'), getCases);

// Doctor routes
router.get('/doctor/cases', authorize('doctor'), getDoctorCases);
router.post('/:caseId/assign', authorize('patient'), assignDoctorToCase);
router.put('/:caseId/status', authorize('doctor'), updateCaseStatus);

// Common routes
router.get('/:caseId', getCaseById);
router.put('/:caseId', updateCase);
router.delete('/:caseId', deleteCase);

export default router;


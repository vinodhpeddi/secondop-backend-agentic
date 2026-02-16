import { Router } from 'express';
import {
  addLabResult,
  getLabResults,
  getLabResultById,
  updateLabResult,
  deleteLabResult,
} from '../controllers/labResults.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', addLabResult);
router.get('/', authorize('patient'), getLabResults);
router.get('/:labResultId', getLabResultById);
router.put('/:labResultId', updateLabResult);
router.delete('/:labResultId', deleteLabResult);

export default router;


import { Router } from 'express';
import {
  createPrescription,
  getPrescriptions,
  getPrescriptionById,
  addMedication,
  updateMedication,
  trackAdherence,
} from '../controllers/prescription.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', authorize('doctor'), createPrescription);
router.get('/', getPrescriptions);
router.get('/:prescriptionId', getPrescriptionById);
router.post('/:prescriptionId/medications', authorize('doctor'), addMedication);
router.put('/medications/:medicationId', updateMedication);
router.post('/medications/:medicationId/adherence', authorize('patient'), trackAdherence);

export default router;


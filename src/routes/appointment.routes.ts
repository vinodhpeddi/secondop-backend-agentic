import { Router } from 'express';
import {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointment,
  cancelAppointment,
  getDoctorAvailability,
} from '../controllers/appointment.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/', authorize('patient'), createAppointment);
router.get('/', getAppointments);
router.get('/:appointmentId', getAppointmentById);
router.put('/:appointmentId', updateAppointment);
router.post('/:appointmentId/cancel', cancelAppointment);
router.get('/doctor/:doctorId/availability', getDoctorAvailability);

export default router;


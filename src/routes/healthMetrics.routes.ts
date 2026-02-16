import { Router } from 'express';
import {
  addHealthMetric,
  getHealthMetrics,
  getHealthMetricsByType,
  deleteHealthMetric,
  createHealthGoal,
  getHealthGoals,
  updateHealthGoal,
} from '../controllers/healthMetrics.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize('patient'));

router.post('/metrics', addHealthMetric);
router.get('/metrics', getHealthMetrics);
router.get('/metrics/:type', getHealthMetricsByType);
router.delete('/metrics/:metricId', deleteHealthMetric);

router.post('/goals', createHealthGoal);
router.get('/goals', getHealthGoals);
router.put('/goals/:goalId', updateHealthGoal);

export default router;


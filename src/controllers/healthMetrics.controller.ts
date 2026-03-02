import { Response, NextFunction } from 'express';
import { query } from '../database/connection';
import { AuthRequest } from '../middleware/auth';

export const addHealthMetric = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { metricType, value, unit, notes } = req.body;
    const userId = req.user!.id;

    const patientResult = await query('SELECT id FROM patients WHERE user_id = $1', [userId]);
    const patientId = patientResult.rows[0].id;

    const result = await query(
      `INSERT INTO health_metrics (patient_id, metric_type, value, unit, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [patientId, metricType, value, unit, notes]
    );

    res.status(201).json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const getHealthMetrics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const patientResult = await query('SELECT id FROM patients WHERE user_id = $1', [userId]);
    const patientId = patientResult.rows[0].id;

    const result = await query(
      'SELECT * FROM health_metrics WHERE patient_id = $1 ORDER BY recorded_date DESC',
      [patientId]
    );

    res.json({
      status: 'success',
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

export const getHealthMetricsByType = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { type } = req.params;
    const userId = req.user!.id;

    const patientResult = await query('SELECT id FROM patients WHERE user_id = $1', [userId]);
    const patientId = patientResult.rows[0].id;

    const result = await query(
      'SELECT * FROM health_metrics WHERE patient_id = $1 AND metric_type = $2 ORDER BY recorded_date DESC',
      [patientId, type]
    );

    res.json({
      status: 'success',
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteHealthMetric = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { metricId } = req.params;
    await query('DELETE FROM health_metrics WHERE id = $1', [metricId]);

    res.json({
      status: 'success',
      message: 'Health metric deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const createHealthGoal = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { goalType, targetValue, targetDate, description } = req.body;
    const userId = req.user!.id;

    const patientResult = await query('SELECT id FROM patients WHERE user_id = $1', [userId]);
    const patientId = patientResult.rows[0].id;

    const result = await query(
      `INSERT INTO health_goals (patient_id, goal_type, target_value, target_date, description, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING *`,
      [patientId, goalType, targetValue, targetDate, description]
    );

    res.status(201).json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const getHealthGoals = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const patientResult = await query('SELECT id FROM patients WHERE user_id = $1', [userId]);
    const patientId = patientResult.rows[0].id;

    const result = await query(
      'SELECT * FROM health_goals WHERE patient_id = $1 ORDER BY created_at DESC',
      [patientId]
    );

    res.json({
      status: 'success',
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

export const updateHealthGoal = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { goalId } = req.params;
    const { status, currentValue, notes } = req.body;

    await query(
      `UPDATE health_goals SET 
       status = COALESCE($1, status),
       current_value = COALESCE($2, current_value),
       notes = COALESCE($3, notes),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [status, currentValue, notes, goalId]
    );

    res.json({
      status: 'success',
      message: 'Health goal updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

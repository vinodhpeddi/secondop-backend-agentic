import { Response, NextFunction } from 'express';
import { query } from '../database/connection';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const addLabResult = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { patientId, caseId, testName, testType, results, referenceRange, unit, status, notes } = req.body;
    const userId = req.user!.id;

    const result = await query(
      `INSERT INTO lab_results (patient_id, case_id, ordered_by, test_name, test_type, results, reference_range, unit, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [patientId, caseId, userId, testName, testType, results, referenceRange, unit, status || 'pending', notes]
    );

    res.status(201).json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const getLabResults = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const patientResult = await query('SELECT id FROM patients WHERE user_id = $1', [userId]);
    const patientId = patientResult.rows[0].id;

    const result = await query(
      'SELECT * FROM lab_results WHERE patient_id = $1 ORDER BY test_date DESC',
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

export const getLabResultById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { labResultId } = req.params;

    const result = await query(
      `SELECT lr.*, 
              p.first_name as patient_first_name,
              p.last_name as patient_last_name,
              u.email as ordered_by_email
       FROM lab_results lr
       JOIN patients p ON lr.patient_id = p.id
       JOIN users u ON lr.ordered_by = u.id
       WHERE lr.id = $1`,
      [labResultId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Lab result not found', 404);
    }

    res.json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const updateLabResult = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { labResultId } = req.params;
    const { results, status, notes } = req.body;

    await query(
      `UPDATE lab_results SET 
       results = COALESCE($1, results),
       status = COALESCE($2, status),
       notes = COALESCE($3, notes),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [results, status, notes, labResultId]
    );

    res.json({
      status: 'success',
      message: 'Lab result updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteLabResult = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { labResultId } = req.params;
    await query('DELETE FROM lab_results WHERE id = $1', [labResultId]);

    res.json({
      status: 'success',
      message: 'Lab result deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};


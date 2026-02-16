import { Response, NextFunction } from 'express';
import { query, transaction } from '../database/connection';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const createCase = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, description, specialty, priority, urgencyLevel } = req.body;
    const userId = req.user!.id;

    // Get patient ID
    const patientResult = await query('SELECT id FROM patients WHERE user_id = $1', [userId]);
    if (patientResult.rows.length === 0) {
      throw new AppError('Patient profile not found', 404);
    }
    const patientId = patientResult.rows[0].id;

    // Generate case number
    const caseNumber = `SO${Date.now()}`;

    const result = await query(
      `INSERT INTO cases (case_number, patient_id, title, description, specialty, priority, urgency_level, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING *`,
      [caseNumber, patientId, title, description, specialty, priority || 'medium', urgencyLevel || 'moderate']
    );

    res.status(201).json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const getCases = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const patientResult = await query('SELECT id FROM patients WHERE user_id = $1', [userId]);
    const patientId = patientResult.rows[0].id;

    const result = await query(
      'SELECT * FROM cases WHERE patient_id = $1 ORDER BY submitted_date DESC',
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

export const getCaseById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { caseId } = req.params;
    const result = await query('SELECT * FROM cases WHERE id = $1', [caseId]);

    if (result.rows.length === 0) {
      throw new AppError('Case not found', 404);
    }

    res.json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const updateCase = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { caseId } = req.params;
    const updates = req.body;

    await query(
      `UPDATE cases SET 
       title = COALESCE($1, title),
       description = COALESCE($2, description),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [updates.title, updates.description, caseId]
    );

    res.json({
      status: 'success',
      message: 'Case updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCase = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { caseId } = req.params;
    await query('DELETE FROM cases WHERE id = $1', [caseId]);

    res.json({
      status: 'success',
      message: 'Case deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const assignDoctorToCase = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { caseId } = req.params;
    const { doctorId } = req.body;

    await query(
      `INSERT INTO case_assignments (case_id, doctor_id, status)
       VALUES ($1, $2, 'assigned')`,
      [caseId, doctorId]
    );

    res.json({
      status: 'success',
      message: 'Doctor assigned to case successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getDoctorCases = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const doctorResult = await query('SELECT id FROM doctors WHERE user_id = $1', [userId]);
    const doctorId = doctorResult.rows[0].id;

    const result = await query(
      `SELECT c.*, ca.status as assignment_status, ca.assigned_date
       FROM cases c
       JOIN case_assignments ca ON c.id = ca.case_id
       WHERE ca.doctor_id = $1
       ORDER BY ca.assigned_date DESC`,
      [doctorId]
    );

    res.json({
      status: 'success',
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCaseStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { caseId } = req.params;
    const { status } = req.body;

    await query(
      'UPDATE cases SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, caseId]
    );

    res.json({
      status: 'success',
      message: 'Case status updated successfully',
    });
  } catch (error) {
    next(error);
  }
};


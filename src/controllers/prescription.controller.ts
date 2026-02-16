import { Response, NextFunction } from 'express';
import { query } from '../database/connection';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const createPrescription = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { patientId, caseId, diagnosis, notes } = req.body;
    const userId = req.user!.id;

    const doctorResult = await query('SELECT id FROM doctors WHERE user_id = $1', [userId]);
    const doctorId = doctorResult.rows[0].id;

    const result = await query(
      `INSERT INTO prescriptions (patient_id, doctor_id, case_id, diagnosis, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [patientId, doctorId, caseId, diagnosis, notes]
    );

    res.status(201).json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const getPrescriptions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const userType = req.user!.type;

    let queryStr = '';
    let params: any[] = [];

    if (userType === 'patient') {
      const patientResult = await query('SELECT id FROM patients WHERE user_id = $1', [userId]);
      const patientId = patientResult.rows[0].id;
      queryStr = 'SELECT * FROM prescriptions WHERE patient_id = $1 ORDER BY prescribed_date DESC';
      params = [patientId];
    } else {
      const doctorResult = await query('SELECT id FROM doctors WHERE user_id = $1', [userId]);
      const doctorId = doctorResult.rows[0].id;
      queryStr = 'SELECT * FROM prescriptions WHERE doctor_id = $1 ORDER BY prescribed_date DESC';
      params = [doctorId];
    }

    const result = await query(queryStr, params);

    res.json({
      status: 'success',
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

export const getPrescriptionById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { prescriptionId } = req.params;

    const result = await query(
      `SELECT p.*, 
              d.first_name as doctor_first_name, 
              d.last_name as doctor_last_name,
              pt.first_name as patient_first_name,
              pt.last_name as patient_last_name
       FROM prescriptions p
       JOIN doctors d ON p.doctor_id = d.id
       JOIN patients pt ON p.patient_id = pt.id
       WHERE p.id = $1`,
      [prescriptionId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Prescription not found', 404);
    }

    res.json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const addMedication = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { prescriptionId } = req.params;
    const { medicationName, dosage, frequency, duration, instructions } = req.body;

    const result = await query(
      `INSERT INTO medications (prescription_id, medication_name, dosage, frequency, duration, instructions)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [prescriptionId, medicationName, dosage, frequency, duration, instructions]
    );

    res.status(201).json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const updateMedication = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { medicationId } = req.params;
    const { dosage, frequency, instructions } = req.body;

    await query(
      `UPDATE medications SET 
       dosage = COALESCE($1, dosage),
       frequency = COALESCE($2, frequency),
       instructions = COALESCE($3, instructions),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [dosage, frequency, instructions, medicationId]
    );

    res.json({
      status: 'success',
      message: 'Medication updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const trackAdherence = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { medicationId } = req.params;
    const { taken, takenAt, notes } = req.body;

    const result = await query(
      `INSERT INTO medication_adherence (medication_id, taken, taken_at, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [medicationId, taken, takenAt || new Date(), notes]
    );

    res.status(201).json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};


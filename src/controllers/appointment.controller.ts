import { Response, NextFunction } from 'express';
import { query } from '../database/connection';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const createAppointment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { doctorId, caseId, appointmentDate, appointmentType, notes } = req.body;
    const userId = req.user!.id;

    const patientResult = await query('SELECT id FROM patients WHERE user_id = $1', [userId]);
    const patientId = patientResult.rows[0].id;

    const result = await query(
      `INSERT INTO appointments (patient_id, doctor_id, case_id, appointment_date, appointment_type, status, notes)
       VALUES ($1, $2, $3, $4, $5, 'scheduled', $6)
       RETURNING *`,
      [patientId, doctorId, caseId, appointmentDate, appointmentType, notes]
    );

    res.status(201).json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const getAppointments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const userType = req.user!.type;

    let queryStr = '';
    let params: any[] = [];

    if (userType === 'patient') {
      const patientResult = await query('SELECT id FROM patients WHERE user_id = $1', [userId]);
      const patientId = patientResult.rows[0].id;
      queryStr = `SELECT a.*, 
                         d.first_name as doctor_first_name,
                         d.last_name as doctor_last_name,
                         d.specialty
                  FROM appointments a
                  JOIN doctors d ON a.doctor_id = d.id
                  WHERE a.patient_id = $1
                  ORDER BY a.appointment_date DESC`;
      params = [patientId];
    } else {
      const doctorResult = await query('SELECT id FROM doctors WHERE user_id = $1', [userId]);
      const doctorId = doctorResult.rows[0].id;
      queryStr = `SELECT a.*, 
                         p.first_name as patient_first_name,
                         p.last_name as patient_last_name
                  FROM appointments a
                  JOIN patients p ON a.patient_id = p.id
                  WHERE a.doctor_id = $1
                  ORDER BY a.appointment_date DESC`;
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

export const getAppointmentById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { appointmentId } = req.params;

    const result = await query(
      `SELECT a.*, 
              p.first_name as patient_first_name,
              p.last_name as patient_last_name,
              d.first_name as doctor_first_name,
              d.last_name as doctor_last_name,
              d.specialty
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN doctors d ON a.doctor_id = d.id
       WHERE a.id = $1`,
      [appointmentId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Appointment not found', 404);
    }

    res.json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const updateAppointment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { appointmentId } = req.params;
    const { appointmentDate, status, notes } = req.body;

    await query(
      `UPDATE appointments SET 
       appointment_date = COALESCE($1, appointment_date),
       status = COALESCE($2, status),
       notes = COALESCE($3, notes),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [appointmentDate, status, notes, appointmentId]
    );

    res.json({
      status: 'success',
      message: 'Appointment updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const cancelAppointment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { appointmentId } = req.params;

    await query(
      'UPDATE appointments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['cancelled', appointmentId]
    );

    res.json({
      status: 'success',
      message: 'Appointment cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getDoctorAvailability = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    // This is a simplified version - in production, you'd have a separate availability table
    const result = await query(
      `SELECT appointment_date, status 
       FROM appointments 
       WHERE doctor_id = $1 AND DATE(appointment_date) = $2`,
      [doctorId, date]
    );

    res.json({
      status: 'success',
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};


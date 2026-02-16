import { Response, NextFunction } from 'express';
import { query } from '../database/connection';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import path from 'path';
import fs from 'fs';

export const uploadFile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const { caseId, category, description } = req.body;
    const userId = req.user!.id;

    // Get patient ID
    const patientResult = await query('SELECT id FROM patients WHERE user_id = $1', [userId]);
    const patientId = patientResult.rows[0].id;

    const fileUrl = `/uploads/${req.file.filename}`;
    const isDicom = req.file.mimetype === 'application/dicom' || req.file.mimetype === 'application/x-dicom';

    const result = await query(
      `INSERT INTO medical_files (case_id, patient_id, uploaded_by, file_name, file_type, file_size, file_url, file_category, description, is_dicom)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [caseId, patientId, userId, req.file.originalname, req.file.mimetype, req.file.size, fileUrl, category, description, isDicom]
    );

    res.status(201).json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const getFiles = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { caseId, patientId } = req.query;
    let queryStr = 'SELECT * FROM medical_files WHERE 1=1';
    const params: any[] = [];

    if (caseId) {
      params.push(caseId);
      queryStr += ` AND case_id = $${params.length}`;
    }

    if (patientId) {
      params.push(patientId);
      queryStr += ` AND patient_id = $${params.length}`;
    }

    queryStr += ' ORDER BY created_at DESC';

    const result = await query(queryStr, params);

    res.json({
      status: 'success',
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

export const getFileById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.params;
    const result = await query('SELECT * FROM medical_files WHERE id = $1', [fileId]);

    if (result.rows.length === 0) {
      throw new AppError('File not found', 404);
    }

    res.json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const downloadFile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.params;
    const result = await query('SELECT * FROM medical_files WHERE id = $1', [fileId]);

    if (result.rows.length === 0) {
      throw new AppError('File not found', 404);
    }

    const file = result.rows[0];
    const filePath = path.join(process.cwd(), file.file_url);

    if (!fs.existsSync(filePath)) {
      throw new AppError('File not found on server', 404);
    }

    res.download(filePath, file.file_name);
  } catch (error) {
    next(error);
  }
};

export const deleteFile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.params;
    const result = await query('SELECT file_url FROM medical_files WHERE id = $1', [fileId]);

    if (result.rows.length > 0) {
      const filePath = path.join(process.cwd(), result.rows[0].file_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await query('DELETE FROM medical_files WHERE id = $1', [fileId]);

    res.json({
      status: 'success',
      message: 'File deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};


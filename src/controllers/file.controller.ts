import { Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { query } from '../database/connection';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

interface AuthorizedFileRow {
  id: string;
  case_id: string | null;
  patient_id: string;
  uploaded_by: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  file_category: string | null;
  description: string | null;
  metadata: unknown;
  is_dicom: boolean;
  created_at: string;
  updated_at: string;
}

const findAccessibleCasePatientId = async (caseId: string, userId: string): Promise<string> => {
  const result = await query(
    `SELECT c.patient_id
     FROM cases c
     JOIN patients p ON p.id = c.patient_id
     LEFT JOIN case_assignments ca ON ca.case_id = c.id
     LEFT JOIN doctors d ON d.id = ca.doctor_id
     WHERE c.id = $1
       AND (p.user_id = $2 OR d.user_id = $2)
     LIMIT 1`,
    [caseId, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Case not found or access denied', 403);
  }

  return result.rows[0].patient_id;
};

const getAccessibleFileById = async (fileId: string, userId: string): Promise<AuthorizedFileRow> => {
  const result = await query(
    `SELECT mf.*
     FROM medical_files mf
     JOIN patients p ON p.id = mf.patient_id
     LEFT JOIN cases c ON c.id = mf.case_id
     LEFT JOIN case_assignments ca ON ca.case_id = c.id
     LEFT JOIN doctors d ON d.id = ca.doctor_id
     WHERE mf.id = $1
       AND (p.user_id = $2 OR d.user_id = $2)
     ORDER BY mf.created_at DESC
     LIMIT 1`,
    [fileId, userId]
  );

  if (result.rows.length === 0) {
    throw new AppError('File not found or access denied', 404);
  }

  return result.rows[0] as AuthorizedFileRow;
};

const resolveStoredFilePath = (fileUrl: string): string => {
  const relativePath = fileUrl.replace(/^\/+/, '');
  return path.join(process.cwd(), relativePath);
};

export const uploadFile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const { caseId, category, description } = req.body;
    const userId = req.user!.id;

    if (!caseId || typeof caseId !== 'string') {
      throw new AppError('caseId is required', 400);
    }

    const patientId = await findAccessibleCasePatientId(caseId, userId);
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
    const { caseId } = req.query;
    const userId = req.user!.id;
    const params: unknown[] = [userId];
    let queryStr =
      `SELECT DISTINCT mf.*
       FROM medical_files mf
       JOIN patients p ON p.id = mf.patient_id
       LEFT JOIN cases c ON c.id = mf.case_id
       LEFT JOIN case_assignments ca ON ca.case_id = c.id
       LEFT JOIN doctors d ON d.id = ca.doctor_id
       WHERE (p.user_id = $1 OR d.user_id = $1)`;

    if (caseId && typeof caseId !== 'string') {
      throw new AppError('caseId must be a string', 400);
    }

    if (caseId) {
      params.push(caseId);
      queryStr += ` AND mf.case_id = $${params.length}`;
    }

    queryStr += ' ORDER BY mf.created_at DESC';

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
    const file = await getAccessibleFileById(fileId, req.user!.id);

    res.json({
      status: 'success',
      data: file,
    });
  } catch (error) {
    next(error);
  }
};

export const downloadFile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { fileId } = req.params;
    const file = await getAccessibleFileById(fileId, req.user!.id);
    const filePath = resolveStoredFilePath(file.file_url);

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
    const file = await getAccessibleFileById(fileId, req.user!.id);

    const filePath = resolveStoredFilePath(file.file_url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
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

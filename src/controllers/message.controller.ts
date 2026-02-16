import { Response, NextFunction } from 'express';
import { query } from '../database/connection';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const sendMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { caseId, receiverId, content, messageType } = req.body;
    const senderId = req.user!.id;

    const attachments = req.files ? (req.files as Express.Multer.File[]).map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    })) : null;

    const result = await query(
      `INSERT INTO messages (case_id, sender_id, receiver_id, content, message_type, attachments)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [caseId, senderId, receiverId, content, messageType || 'text', JSON.stringify(attachments)]
    );

    // Emit socket event for real-time messaging
    const io = req.app.get('io');
    io.to(`case-${caseId}`).emit('new-message', result.rows[0]);

    res.status(201).json({
      status: 'success',
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { caseId } = req.params;

    const result = await query(
      `SELECT m.*, 
              u1.email as sender_email,
              u2.email as receiver_email
       FROM messages m
       JOIN users u1 ON m.sender_id = u1.id
       JOIN users u2 ON m.receiver_id = u2.id
       WHERE m.case_id = $1
       ORDER BY m.created_at ASC`,
      [caseId]
    );

    res.json({
      status: 'success',
      data: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { messageId } = req.params;

    await query(
      'UPDATE messages SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE id = $1',
      [messageId]
    );

    res.json({
      status: 'success',
      message: 'Message marked as read',
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { messageId } = req.params;
    await query('DELETE FROM messages WHERE id = $1', [messageId]);

    res.json({
      status: 'success',
      message: 'Message deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};


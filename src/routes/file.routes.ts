import { Router } from 'express';
import {
  uploadFile,
  getFiles,
  getFileById,
  deleteFile,
  downloadFile,
} from '../controllers/file.controller';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.use(authenticate);

router.post('/upload', upload.single('file'), uploadFile);
router.get('/', getFiles);
router.get('/:fileId', getFileById);
router.get('/:fileId/download', downloadFile);
router.delete('/:fileId', deleteFile);

export default router;


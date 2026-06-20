import { Router } from 'express';
import multer from 'multer';
import { verifyToken, requireTeacher } from '../middleware/auth';
import { bulkUploadProblems, getTeacherProblems } from '../controllers/problemController';

const router = Router();

// Configure multer for in-memory file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/csv',
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Invalid file type. Only .xlsx, .xls, and .csv files are allowed.'
        )
      );
    }
  },
});

/**
 * POST /api/teacher/problems/bulk
 *
 * Upload an Excel/CSV file to bulk create problems.
 * Protected: Requires TEACHER role.
 */
router.post(
  '/bulk',
  verifyToken,
  requireTeacher,
  upload.single('file'),
  bulkUploadProblems
);

/**
 * GET /api/teacher/problems
 *
 * List all problems created by the authenticated teacher.
 * Protected: Requires TEACHER role.
 */
router.get('/', verifyToken, requireTeacher, getTeacherProblems);

export default router;

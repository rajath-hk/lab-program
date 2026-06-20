import { Router } from 'express';
import { verifyToken, requireTeacher } from '../middleware/auth';
import {
  getOverviewStats,
  getSubmissionTrends,
  getProblemPerformance,
  getStudentPerformance,
} from '../controllers/analyticsController';

const router = Router();

router.get('/overview', verifyToken, requireTeacher, getOverviewStats);
router.get('/submission-trends', verifyToken, requireTeacher, getSubmissionTrends);
router.get('/problem-performance', verifyToken, requireTeacher, getProblemPerformance);
router.get('/student-performance', verifyToken, requireTeacher, getStudentPerformance);

export default router;

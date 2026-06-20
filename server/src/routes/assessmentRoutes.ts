import { Router } from 'express';
import { verifyToken, requireTeacher, requireStudent } from '../middleware/auth';
import {
  getSubmissionsForReview,
  getSubmissionDetail,
  updateSubmissionStatus,
  createHelpRequest,
  getHelpRequests,
  resolveHelpRequest,
} from '../controllers/assessmentController';

const router = Router();

// Teacher routes
router.get('/submissions', verifyToken, requireTeacher, getSubmissionsForReview);
router.get('/submissions/:id', verifyToken, requireTeacher, getSubmissionDetail);
router.patch('/submissions/:id/status', verifyToken, requireTeacher, updateSubmissionStatus);
router.get('/help-requests', verifyToken, requireTeacher, getHelpRequests);
router.patch('/help-requests/:id/resolve', verifyToken, requireTeacher, resolveHelpRequest);

// Student routes
router.post('/help-request', verifyToken, requireStudent, createHelpRequest);

export default router;

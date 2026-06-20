import { Router } from 'express';
import { verifyToken, requireTeacher } from '../middleware/auth';
import {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
} from '../controllers/teacherStudentController';

const router = Router();

// Create a new student (teacher only)
router.post('/', verifyToken, requireTeacher, createStudent);

// List all students
router.get('/', verifyToken, requireTeacher, getStudents);

// Get single student details
router.get('/:id', verifyToken, requireTeacher, getStudentById);

// Update student (name/email/password)
router.patch('/:id', verifyToken, requireTeacher, updateStudent);

// Delete student
router.delete('/:id', verifyToken, requireTeacher, deleteStudent);

export default router;

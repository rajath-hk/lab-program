import { Router } from 'express';
import { register, login } from '../controllers/authController';

const router = Router();

/**
 * POST /api/auth/register
 *
 * Registers a new user account.
 * Body: { "name": "...", "email": "...", "password": "...", "role": "STUDENT" | "TEACHER" }
 * Response: 201 { "message": "Registration successful", "user": { "id", "name", "email", "role" } }
 */
router.post('/register', register);

/**
 * POST /api/auth/login
 *
 * Authenticates an existing user and returns a JWT token.
 * Body: { "email": "...", "password": "..." }
 * Response: 200 { "token": "ey...", "user": { "id", "name", "email", "role" } }
 */
router.post('/login', login);

export default router;

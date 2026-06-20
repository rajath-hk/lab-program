import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BCRYPT_SALT_ROUNDS = 10;
const JWT_EXPIRY = '24h';

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
};

interface RegisterRequestBody {
  name: string;
  email: string;
  password: string;
  role?: 'STUDENT' | 'TEACHER';
}

interface LoginRequestBody {
  email: string;
  password: string;
}

/**
 * Validates that a string is a non-empty trimmed value.
 */
const isValidNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

/**
 * Validates email format using a basic regex pattern.
 */
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates password strength:
 * - At least 8 characters
 * - At most 128 characters
 */
const isValidPassword = (password: string): boolean => {
  return password.length >= 8 && password.length <= 128;
};

/**
 * Validates that role is either STUDENT or TEACHER (case-insensitive).
 */
const isValidRole = (role: unknown): role is 'STUDENT' | 'TEACHER' => {
  if (typeof role !== 'string') return false;
  const upper = role.toUpperCase();
  return upper === 'STUDENT' || upper === 'TEACHER';
};

/**
 * POST /api/auth/register
 *
 * Request:  { "name": "...", "email": "...", "password": "...", "role": "STUDENT"|"TEACHER" }
 * Response: 201 { "message": "Registration successful", "user": { "id", "name", "email", "role" } }
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password, role } = req.body as RegisterRequestBody;

    // --- Input Validation ---

    if (!isValidNonEmptyString(name)) {
      res.status(400).json({ error: 'Validation Error: name is required and must be a non-empty string' });
      return;
    }

    if (!isValidNonEmptyString(email)) {
      res.status(400).json({ error: 'Validation Error: email is required and must be a non-empty string' });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Validation Error: email must be a valid email address' });
      return;
    }

    if (!isValidNonEmptyString(password)) {
      res.status(400).json({ error: 'Validation Error: password is required and must be a non-empty string' });
      return;
    }

    if (!isValidPassword(password)) {
      res.status(400).json({
        error: 'Validation Error: password must be between 8 and 128 characters',
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // --- Check for duplicate email ---

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      res.status(409).json({ error: 'Conflict: A user with this email already exists' });
      return;
    }

    // --- Hash Password ---

    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
    const passwordHash = await bcrypt.hash(password, salt);

    // --- Determine Role ---

    let userRole: 'STUDENT' | 'TEACHER' = 'STUDENT';
    if (role !== undefined) {
      if (!isValidRole(role)) {
        res.status(400).json({
          error: 'Validation Error: role must be either "STUDENT" or "TEACHER"',
        });
        return;
      }
      userRole = role.toUpperCase() as 'STUDENT' | 'TEACHER';
    }

    // --- Create User ---

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: userRole,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    res.status(201).json({
      message: 'Registration successful',
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 *
 * Request:  { "email": "...", "password": "..." }
 * Response: 200 { "token": "ey...", "user": { "id", "name", "email", "role" } }
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body as LoginRequestBody;

    // --- Input Validation ---

    if (!isValidNonEmptyString(email)) {
      res.status(400).json({ error: 'Validation Error: email is required and must be a non-empty string' });
      return;
    }

    if (!isValidNonEmptyString(password)) {
      res.status(400).json({ error: 'Validation Error: password is required and must be a non-empty string' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // --- Query User by Email ---

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      res.status(401).json({ error: 'Authentication Failed: Invalid email or password' });
      return;
    }

    // --- Validate Password ---

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      res.status(401).json({ error: 'Authentication Failed: Invalid email or password' });
      return;
    }

    // --- Generate JWT ---

    const secret = getJwtSecret();

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(tokenPayload, secret, {
      expiresIn: JWT_EXPIRY,
    });

    res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

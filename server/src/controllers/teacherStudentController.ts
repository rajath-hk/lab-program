import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

const BCRYPT_SALT_ROUNDS = 10;

/** Helper validation functions (mirroring auth controller) */
const isValidNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * POST /api/teacher/students
 * Create a new student account. Password optional – a random password is generated if omitted.
 */
export const createStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password } = req.body as { name?: string; email?: string; password?: string };

    // --- Validation ---
    if (!isValidNonEmptyString(name)) {
      res.status(400).json({ error: 'Validation Error: name is required and must be a non-empty string' });
      return;
    }
    if (!isValidNonEmptyString(email) || !isValidEmail(email)) {
      res.status(400).json({ error: 'Validation Error: a valid email is required' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // --- Duplicate check ---
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      res.status(409).json({ error: 'Conflict: A user with this email already exists' });
      return;
    }

    // --- Determine password ---
    const rawPassword = isValidNonEmptyString(password) ? password : crypto.randomBytes(4).toString('hex');
    const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    // --- Create student ---
    const student = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: Role.STUDENT,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    // Return created student (and generated password if it was auto‑generated)
    res.status(201).json({
      message: 'Student created',
      student,
      ...(password ? {} : { generatedPassword: rawPassword }),
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/teacher/students – list all students */
export const getStudents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const students = await prisma.user.findMany({
      where: { role: Role.STUDENT },
      select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
    });
    res.json(students);
  } catch (error) {
    next(error);
  }
};

/** GET /api/teacher/students/:id */
export const getStudentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const student = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
    });
    if (!student) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }
    res.json(student);
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/teacher/students/:id – update name, email, or password */
export const updateStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, password } = req.body as { name?: string; email?: string; password?: string };

    const data: any = {};
    if (name !== undefined) {
      if (!isValidNonEmptyString(name)) {
        res.status(400).json({ error: 'Validation Error: name must be a non-empty string' });
        return;
      }
      data.name = name.trim();
    }
    if (email !== undefined) {
      if (!isValidNonEmptyString(email) || !isValidEmail(email)) {
        res.status(400).json({ error: 'Validation Error: valid email required' });
        return;
      }
      data.email = email.toLowerCase().trim();
    }
    if (password !== undefined) {
      if (!isValidNonEmptyString(password) || password.length < 8) {
        res.status(400).json({ error: 'Validation Error: password must be at least 8 characters' });
        return;
      }
      const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
      data.passwordHash = await bcrypt.hash(password, salt);
    }

    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: 'No updatable fields provided' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, updatedAt: true },
    });
    res.json({ message: 'Student updated', student: updated });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/teacher/students/:id */
export const deleteStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'Student deleted' });
  } catch (error) {
    next(error);
  }
};

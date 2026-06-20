import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthUser } from '../types/express';

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
};

/**
 * Middleware: Extracts and verifies the Bearer JWT token from the Authorization header.
 * On success, attaches decoded payload to req.user and calls next().
 * On failure, responds with 401 (missing/malformed) or 403 (expired/invalid).
 */
export const verifyToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({ error: 'Access Denied: No authorization header provided' });
      return;
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        error: 'Access Denied: Invalid authorization format. Use: Bearer <token>',
      });
      return;
    }

    const token = parts[1];

    if (!token || token.trim() === '') {
      res.status(401).json({ error: 'Access Denied: Token is empty' });
      return;
    }

    const secret = getJwtSecret();

    const decoded = jwt.verify(token, secret) as AuthUser & { iat: number; exp: number };

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(403).json({ error: 'Forbidden: Token has expired' });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(403).json({ error: 'Forbidden: Invalid token' });
      return;
    }

    if (error instanceof jwt.NotBeforeError) {
      res.status(403).json({ error: 'Forbidden: Token is not yet active' });
      return;
    }

    res.status(500).json({ error: 'Internal server error during token verification' });
  }
};

/**
 * Middleware: Requires the authenticated user to have TEACHER role.
 * Must be used AFTER verifyToken middleware.
 * Returns 403 if the user is not a TEACHER.
 */
export const requireTeacher = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized: Authentication required' });
    return;
  }

  if (req.user.role !== 'TEACHER') {
    res.status(403).json({ error: 'Access Denied: Teacher role required' });
    return;
  }

  next();
};

/**
 * Middleware: Requires the authenticated user to have STUDENT role.
 * Must be used AFTER verifyToken middleware.
 * Returns 403 if the user is not a STUDENT.
 */
export const requireStudent = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized: Authentication required' });
    return;
  }

  if (req.user.role !== 'STUDENT') {
    res.status(403).json({ error: 'Access Denied: Student role required' });
    return;
  }

  next();
};

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import problemRoutes from './routes/problemRoutes';
import teacherStudentRoutes from './routes/teacherStudentRoutes';
import studentRoutes from './routes/studentRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import assessmentRoutes from './routes/assessmentRoutes';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// --- Global Middleware ---

app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// --- Health Check ---

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Routes ---

app.use('/api/auth', authRoutes);

// --- Teacher Problem Routes ---

app.use('/api/teacher/problems', problemRoutes);
app.use('/api/teacher/students', teacherStudentRoutes);

// --- Student Routes ---

app.use('/api/student', studentRoutes);

// --- Analytics Routes ---

app.use('/api/teacher/analytics', analyticsRoutes);

// --- Assessment & Help Routes ---

app.use('/api/teacher', assessmentRoutes);
app.use('/api/student', assessmentRoutes);

// --- 404 Handler ---

app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found: The requested resource does not exist' });
});

// --- Global Error Handler ---

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('[Server Error]', err);

    // Handle multer errors (file too large, wrong type via fileFilter)
    if (err.name === 'MulterError') {
      res.status(400).json({ error: `Upload Error: ${err.message}` });
      return;
    }

    // Handle multer fileFilter rejections (plain Error from cb(new Error(...)))
    if (
      err.message &&
      (err.message.includes('Invalid file type') ||
        err.message.includes('Only .xlsx'))
    ) {
      res.status(400).json({ error: err.message });
      return;
    }

    // Prisma known request errors
    if (err.constructor && err.constructor.name === 'PrismaClientKnownRequestError') {
      res.status(400).json({ error: 'Database error: Invalid request' });
      return;
    }

    res.status(500).json({
      error: 'Internal Server Error: Something went wrong',
    });
  }
);

// --- Warm up code executor (pre-pull Docker images) ---

import('./services/dockerExecutor').then(({ warmupImages }) => {
  warmupImages().then(() => {
    console.log('[MCA Lab Portal] Code executor images ready');
  }).catch((err: Error) => {
    console.warn('[MCA Lab Portal] Code executor warmup failed:', err.message);
  });
});

// --- Start Server ---

app.listen(PORT, () => {
  console.log(`[MCA Lab Portal] Server running on http://localhost:${PORT}`);
});

export default app;

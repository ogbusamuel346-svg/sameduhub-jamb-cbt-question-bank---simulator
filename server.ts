import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Neon injects DATABASE_URL after `neon link` / `neon deploy`. Never ship a
// database credential or use a local auth fallback in application code.
const NEON_PG_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const neonDatabaseUrl = (() => {
  if (!NEON_PG_URL) return null;
  try {
    return new URL(NEON_PG_URL);
  } catch {
    console.error('[Neon DB] DATABASE_URL is not a valid PostgreSQL URL.');
    return null;
  }
})();

const neonAuthJwks = (() => {
  if (!process.env.NEON_AUTH_JWKS_URL) return null;
  try {
    return createRemoteJWKSet(new URL(process.env.NEON_AUTH_JWKS_URL));
  } catch (error) {
    console.error('[Neon Auth] Invalid NEON_AUTH_JWKS_URL:', error);
    return null;
  }
})();

const pool = new Pool({
  connectionString: NEON_PG_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Initialize database tables if not already present
async function initNeonDatabase() {
  try {
    await pool.query(`
      -- Neon Auth owns credentials and sessions in neon_auth. This table only
      -- stores the application's candidate profile keyed by Neon Auth user id.
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(32) NOT NULL DEFAULT 'student',
        jamb_reg_number VARCHAR(64),
        target_score INT DEFAULT 300,
        avatar_url TEXT,
        selected_subjects TEXT[],
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS selected_subjects TEXT[];
      ALTER TABLE users ADD COLUMN IF NOT EXISTS target_score INT DEFAULT 300;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS jamb_reg_number VARCHAR(64);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

      CREATE TABLE IF NOT EXISTS test_sessions (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
        mode VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL,
        subjects TEXT[] NOT NULL,
        question_ids TEXT[] NOT NULL,
        answers JSONB DEFAULT '{}'::jsonb,
        marked_for_review TEXT[] DEFAULT ARRAY[]::TEXT[],
        score INT NOT NULL DEFAULT 0,
        total_questions INT NOT NULL,
        total_max_score INT NOT NULL DEFAULT 400,
        final_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
        time_allowed_seconds INT NOT NULL,
        time_spent_seconds INT NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'completed',
        subject_breakdown JSONB DEFAULT '[]'::jsonb,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('[Neon DB] Tables verified and ready on Neon PostgreSQL.');
  } catch (err: any) {
    console.error('[Neon DB] Table initialization error:', err.message);
  }
}

async function authenticateRequest(req: Request): Promise<JWTPayload> {
  const authorization = req.header('authorization');
  const token = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : '';

  if (!token || !neonAuthJwks) {
    throw new Error('Missing or unconfigured Neon Auth bearer token.');
  }

  const { payload } = await jwtVerify(token, neonAuthJwks, {
    issuer: process.env.NEON_AUTH_BASE_URL || undefined,
  });

  if (!payload.sub) {
    throw new Error('Neon Auth token does not contain a user id.');
  }

  return payload;
}

function sendUnauthorized(res: Response, error = 'Neon Auth session required.') {
  return res.status(401).json({ success: false, error });
}

function profileFromRow(row: any) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    jambRegNumber: row.jambRegNumber,
    targetScore: row.targetScore || 320,
    avatarUrl: row.avatarUrl,
    selectedSubjects: row.selectedSubjects || ['english', 'mathematics', 'physics', 'chemistry'],
    createdAt: row.createdAt,
  };
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // Initialize DB asynchronously
  initNeonDatabase();

  // ----------------------------------------------------
  // 1. Neon DB Health Check
  // ----------------------------------------------------
  app.get('/api/neon/health', async (_req: Request, res: Response) => {
    const startTime = Date.now();
    try {
      const dbRes = await pool.query(`
        SELECT 
          NOW() as server_time,
          (SELECT COUNT(*) FROM users) as user_count,
          to_regclass('public.questions') IS NOT NULL as questions_ready
      `);
      const latencyMs = Date.now() - startTime;
      const row = dbRes.rows[0];
      const questionCount = row.questions_ready
        ? Number((await pool.query('SELECT COUNT(*)::int AS count FROM questions')).rows[0].count)
        : 0;

      return res.json({
        success: true,
        isConnected: true,
        database: neonDatabaseUrl?.pathname.replace(/^\//, '') || 'neondb',
        host: neonDatabaseUrl?.hostname || 'Neon database',
        latencyMs,
        userCount: parseInt(row.user_count, 10) || 0,
        questionCount,
        serverTime: row.server_time,
      });
    } catch (err: any) {
      console.error('[Neon Health Error]', err.message);
      return res.status(500).json({
        success: false,
        isConnected: false,
        error: err.message,
      });
    }
  });

  // ----------------------------------------------------
  // 2. Candidate profile linked to Neon Auth identity
  // ----------------------------------------------------
  app.get('/api/auth/profile', async (req: Request, res: Response) => {
    try {
      const authUser = await authenticateRequest(req);
      const result = await pool.query(
        `SELECT
          id,
          name,
          email,
          role,
          jamb_reg_number AS "jambRegNumber",
          target_score AS "targetScore",
          avatar_url AS "avatarUrl",
          selected_subjects AS "selectedSubjects",
          created_at AS "createdAt"
        FROM users
        WHERE id = $1
        LIMIT 1`,
        [authUser.sub]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Candidate profile not found.' });
      }

      return res.json({ success: true, user: profileFromRow(result.rows[0]) });
    } catch (error: any) {
      if (error.code === 'ERR_JWT_INVALID' || error.message?.includes('bearer token')) {
        return sendUnauthorized(res, 'Invalid Neon Auth session.');
      }
      console.error('[Neon Profile Read Error]', error.message);
      return res.status(500).json({ success: false, error: 'Unable to load Neon profile.' });
    }
  });

  app.post('/api/auth/profile', async (req: Request, res: Response) => {
    try {
      const authUser = await authenticateRequest(req);
      const { name, email, jambRegNumber, targetScore, selectedSubjects } = req.body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Full name is required.' });
      }
      if (!email || typeof email !== 'string' || !email.trim()) {
        return res.status(400).json({ success: false, error: 'Email address is required.' });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const tokenEmail = typeof authUser.email === 'string' ? authUser.email.toLowerCase() : null;
      if (tokenEmail && tokenEmail !== normalizedEmail) {
        return sendUnauthorized(res, 'Profile email must match the Neon Auth identity.');
      }

      const finalReg = jambRegNumber && String(jambRegNumber).trim()
        ? String(jambRegNumber).trim().toUpperCase()
        : `2026/UTME/${Math.floor(100000 + Math.random() * 900000)}`;
      const finalSubjects = Array.isArray(selectedSubjects) && selectedSubjects.length > 0
        ? selectedSubjects
        : ['english', 'mathematics', 'physics', 'chemistry'];
      const finalScore = targetScore && Number(targetScore) > 0 ? Number(targetScore) : 320;
      const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}`;

      const result = await pool.query(
        `INSERT INTO users (
          id, name, email, role, jamb_reg_number, target_score, avatar_url, selected_subjects
        ) VALUES ($1, $2, $3, 'student', $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          jamb_reg_number = EXCLUDED.jamb_reg_number,
          target_score = EXCLUDED.target_score,
          avatar_url = EXCLUDED.avatar_url,
          selected_subjects = EXCLUDED.selected_subjects
        RETURNING
          id,
          name,
          email,
          role,
          jamb_reg_number AS "jambRegNumber",
          target_score AS "targetScore",
          avatar_url AS "avatarUrl",
          selected_subjects AS "selectedSubjects",
          created_at AS "createdAt"`,
        [
          authUser.sub,
          name.trim(),
          normalizedEmail,
          finalReg,
          finalScore,
          avatarUrl,
          finalSubjects,
        ]
      );

      return res.status(201).json({
        success: true,
        user: profileFromRow(result.rows[0]),
        message: 'Candidate profile saved in Neon PostgreSQL.',
      });
    } catch (error: any) {
      if (error.code === 'ERR_JWT_INVALID' || error.message?.includes('bearer token')) {
        return sendUnauthorized(res, 'Invalid Neon Auth session.');
      }
      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          error: 'That email or JAMB registration number is already linked to another Neon profile.',
        });
      }
      console.error('[Neon Profile Write Error]', error.message);
      return res.status(500).json({ success: false, error: 'Unable to save Neon profile.' });
    }
  });

  // ----------------------------------------------------
  // 5. Save Completed Test Session to Neon
  // ----------------------------------------------------
  app.post('/api/test-sessions', async (req: Request, res: Response) => {
    try {
      const authUser = await authenticateRequest(req);
      const session = req.body;
      if (!session || !session.id) {
        return res.status(400).json({ success: false, error: 'Invalid session data' });
      }

      if (session.userId !== authUser.sub) {
        return sendUnauthorized(res, 'You can only save sessions for your Neon Auth user.');
      }

      // The bearer token and user_id check above protect this write from cross-user saves.
      await pool.query(
        `INSERT INTO test_sessions (
          id, user_id, mode, title, subjects, question_ids, answers, marked_for_review,
          score, total_questions, total_max_score, final_percentage, time_allowed_seconds,
          time_spent_seconds, status, subject_breakdown, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
        ON CONFLICT (id) DO UPDATE SET 
          score = EXCLUDED.score,
          answers = EXCLUDED.answers,
          final_percentage = EXCLUDED.final_percentage,
          completed_at = NOW()`,
        [
          session.id,
          session.userId,
          session.mode,
          session.title,
          session.subjects || [],
          session.questionIds || [],
          JSON.stringify(session.answers || {}),
          session.markedForReview || [],
          session.score || 0,
          session.totalQuestions || 0,
          session.totalMaxScore || 400,
          session.finalPercentage || 0,
          session.timeAllowedSeconds || 7200,
          session.timeSpentSeconds || 0,
          session.status || 'completed',
          JSON.stringify(session.subjectBreakdown || []),
        ]
      );

      return res.json({ success: true, message: 'Session saved to Neon database.' });
    } catch (err: any) {
      if (err.code === 'ERR_JWT_INVALID' || err.message?.includes('bearer token')) {
        return sendUnauthorized(res, 'Invalid Neon Auth session.');
      }
      console.error('[Neon Save Session Error]', err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // ----------------------------------------------------
  // 6. Vite Frontend Middleware or Static Assets
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Neon Server] SamEduHub fullstack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

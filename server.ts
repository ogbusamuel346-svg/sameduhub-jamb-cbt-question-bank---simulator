import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { GoogleGenAI } from '@google/genai';
import { JAMB_SUBJECTS, JAMB_SYLLABUS_SOURCE_URL, SUBJECT_TOPICS } from './src/data/subjects.ts';

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

class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

const QUESTION_STATUSES = ['draft', 'pending', 'approved', 'rejected'] as const;
const QUESTION_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const QUESTION_OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;

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

      CREATE TABLE IF NOT EXISTS questions (
        id VARCHAR(64) PRIMARY KEY,
        subject_id VARCHAR(64) NOT NULL,
        topic VARCHAR(255) NOT NULL,
        difficulty VARCHAR(32) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
        year INT,
        passage TEXT,
        question_text TEXT NOT NULL,
        image_url TEXT,
        option_a TEXT NOT NULL,
        option_b TEXT NOT NULL,
        option_c TEXT NOT NULL,
        option_d TEXT NOT NULL,
        correct_answer VARCHAR(1) NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
        explanation TEXT NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'approved' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
        created_by VARCHAR(255) NOT NULL,
        reviewed_by VARCHAR(255),
        review_notes TEXT,
        source VARCHAR(32) NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'ai_generated')),
        syllabus_reference TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE questions ADD COLUMN IF NOT EXISTS source VARCHAR(32) NOT NULL DEFAULT 'manual';
      ALTER TABLE questions ADD COLUMN IF NOT EXISTS syllabus_reference TEXT;
      CREATE INDEX IF NOT EXISTS idx_questions_subject_topic_difficulty
        ON questions(subject_id, topic, difficulty);
      CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);

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

function questionFromRow(row: any) {
  return {
    id: row.id,
    subjectId: row.subject_id,
    topic: row.topic,
    difficulty: row.difficulty,
    year: row.year ?? undefined,
    passage: row.passage ?? undefined,
    questionText: row.question_text,
    imageUrl: row.image_url ?? undefined,
    options: {
      A: row.option_a,
      B: row.option_b,
      C: row.option_c,
      D: row.option_d,
    },
    correctAnswer: row.correct_answer,
    explanation: row.explanation,
    status: row.status,
    source: row.source || 'manual',
    syllabusReference: row.syllabus_reference ?? undefined,
    createdBy: row.created_by,
    reviewedBy: row.reviewed_by ?? undefined,
    reviewNotes: row.review_notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function requireAdmin(req: Request) {
  const authUser = await authenticateRequest(req);
  const result = await pool.query(
    'SELECT name, email, role FROM users WHERE id = $1 LIMIT 1',
    [authUser.sub],
  );
  const profile = result.rows[0];

  if (!profile || profile.role !== 'admin') {
    throw new HttpError(403, 'Admin access is required for question management.');
  }

  return {
    authUser,
    name: profile.name || profile.email || 'SamEduHub Admin',
  };
}

function respondWithError(res: Response, error: any, fallback: string) {
  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({ success: false, error: error.message });
  }
  if (error?.code === 'ERR_JWT_INVALID' || error?.message?.includes('bearer token')) {
    return sendUnauthorized(res, 'Invalid Neon Auth session.');
  }
  console.error(`[Neon API Error] ${fallback}`, error?.message || error);
  return res.status(500).json({ success: false, error: fallback });
}

function normalizeQuestionPayload(body: any) {
  const options = body?.options || {};
  const subjectId = typeof body?.subjectId === 'string' ? body.subjectId.trim() : '';
  const topic = typeof body?.topic === 'string' ? body.topic.trim() : '';
  const questionText = typeof body?.questionText === 'string' ? body.questionText.trim() : '';
  const explanation = typeof body?.explanation === 'string' ? body.explanation.trim() : '';
  const createdBy = typeof body?.createdBy === 'string' && body.createdBy.trim()
    ? body.createdBy.trim()
    : 'SamEduHub Admin';
  const correctAnswer = typeof body?.correctAnswer === 'string'
    ? body.correctAnswer.trim().toUpperCase()
    : '';
  const status = QUESTION_STATUSES.includes(body?.status) ? body.status : 'pending';
  const difficulty = QUESTION_DIFFICULTIES.includes(body?.difficulty) ? body.difficulty : null;

  if (!subjectId || !topic || !questionText || !explanation || !difficulty) {
    throw new HttpError(400, 'Subject, topic, difficulty, question text, and explanation are required.');
  }
  if (!QUESTION_OPTION_KEYS.every(key => typeof options[key] === 'string' && options[key].trim())) {
    throw new HttpError(400, 'Every question must include four non-empty options.');
  }
  if (!QUESTION_OPTION_KEYS.includes(correctAnswer)) {
    throw new HttpError(400, 'The correct answer must be A, B, C, or D.');
  }

  return {
    id: typeof body?.id === 'string' && body.id.trim()
      ? body.id.trim()
      : `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    subjectId,
    topic,
    difficulty,
    year: body?.year ? Number(body.year) : null,
    passage: typeof body?.passage === 'string' && body.passage.trim() ? body.passage.trim() : null,
    questionText,
    imageUrl: typeof body?.imageUrl === 'string' && body.imageUrl.trim() ? body.imageUrl.trim() : null,
    options: {
      A: options.A.trim(),
      B: options.B.trim(),
      C: options.C.trim(),
      D: options.D.trim(),
    },
    correctAnswer,
    explanation,
    status,
    source: body?.source === 'ai_generated' ? 'ai_generated' : 'manual',
    syllabusReference: typeof body?.syllabusReference === 'string' && body.syllabusReference.trim()
      ? body.syllabusReference.trim()
      : null,
    createdBy,
    reviewedBy: typeof body?.reviewedBy === 'string' && body.reviewedBy.trim() ? body.reviewedBy.trim() : null,
    reviewNotes: typeof body?.reviewNotes === 'string' && body.reviewNotes.trim() ? body.reviewNotes.trim() : null,
  };
}

function parseGeneratedQuestionResponse(rawText: string) {
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const parsed = JSON.parse(cleaned);
  return Array.isArray(parsed) ? parsed : parsed?.questions;
}

async function generateQuestionDrafts(
  subjectId: string,
  topic: string,
  difficulty: string,
  count: number,
  createdBy: string,
) {
  if (!process.env.GEMINI_API_KEY) {
    throw new HttpError(503, 'Question generation is not configured. Add GEMINI_API_KEY to the server environment.');
  }

  const subject = JAMB_SUBJECTS.find(item => item.id === subjectId);
  if (!subject) throw new HttpError(400, 'Select a valid JAMB subject.');

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const syllabusTopics = SUBJECT_TOPICS[subjectId] || [];
  const prompt = `
You are a careful Nigerian UTME/JAMB practice-question writer.

Create exactly ${count} original multiple-choice practice questions for:
- Subject: ${subject.name}
- Topic: ${topic}
- Difficulty: ${difficulty}
- Subject scope: ${subject.description}
- Available syllabus topic labels in this app: ${syllabusTopics.join('; ')}

Use the JAMB Integrated Brochure and Syllabus System (IBASS) as the syllabus reference: ${JAMB_SYLLABUS_SOURCE_URL}
Stay within the selected subject and topic. Do not invent a topic outside that scope.
These are original practice questions, NOT official JAMB questions. Do not claim that JAMB authored, endorsed, or previously used them, and do not reproduce past questions verbatim.

Return only valid JSON: an array of exactly ${count} objects. Each object must have:
questionText (string), passage (string or empty string), options (object with exactly A, B, C, D string values), correctAnswer (exactly one of A/B/C/D), and explanation (string).
Each question must have four distinct options, exactly one defensible correct answer, and an explanation that teaches the reasoning. Avoid duplicate stems and avoid ambiguous wording.
`.trim();

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    contents: prompt,
    config: {
      temperature: 0.65,
      maxOutputTokens: Math.min(32768, 1400 + count * 520),
      responseMimeType: 'application/json',
    },
  });

  const rawText = response.text?.trim();
  if (!rawText) throw new HttpError(502, 'The question model returned an empty response.');

  let rawQuestions: any[];
  try {
    rawQuestions = parseGeneratedQuestionResponse(rawText);
  } catch {
    throw new HttpError(502, 'The question model returned invalid JSON. Please try again.');
  }
  if (!Array.isArray(rawQuestions)) {
    throw new HttpError(502, 'The question model did not return a question array.');
  }

  const drafts = rawQuestions
    .map((item, index) => {
      const options = item?.options || {};
      const normalizedOptions = Array.isArray(options)
        ? { A: options[0], B: options[1], C: options[2], D: options[3] }
        : options;
      const correctAnswer = typeof item?.correctAnswer === 'string'
        ? item.correctAnswer.trim().toUpperCase()
        : '';
      const optionValues = QUESTION_OPTION_KEYS.map(key => String(normalizedOptions[key] || '').trim());
      const valid = typeof item?.questionText === 'string'
        && item.questionText.trim()
        && optionValues.every(Boolean)
        && new Set(optionValues.map(value => value.toLowerCase())).size === 4
        && QUESTION_OPTION_KEYS.includes(correctAnswer)
        && typeof item?.explanation === 'string'
        && item.explanation.trim();

      if (!valid) return null;

      const now = new Date().toISOString();
      return {
        id: `ai-draft-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
        subjectId,
        topic,
        difficulty,
        passage: typeof item.passage === 'string' && item.passage.trim() ? item.passage.trim() : undefined,
        questionText: item.questionText.trim(),
        options: {
          A: optionValues[0],
          B: optionValues[1],
          C: optionValues[2],
          D: optionValues[3],
        },
        correctAnswer,
        explanation: item.explanation.trim(),
        status: 'pending',
        source: 'ai_generated',
        syllabusReference: `JAMB IBASS syllabus reference (${JAMB_SYLLABUS_SOURCE_URL}); AI draft, not an official JAMB question.`,
        createdBy: `${createdBy} · AI draft`,
        createdAt: now,
        updatedAt: now,
      };
    })
    .filter(Boolean);

  if (drafts.length < count) {
    throw new HttpError(502, `The model returned ${drafts.length} valid questions instead of ${count}. Please try again.`);
  }

  return drafts.slice(0, count);
}

export async function createApiApp() {
  const app = express();

  app.use(express.json());

  // Ensure schema setup completes before API requests run, including on a
  // cold-started Vercel function.
  const databaseReady = initNeonDatabase();
  app.use(async (_req: Request, _res: Response, next) => {
    await databaseReady;
    next();
  });

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
  // 5. Admin question generation and Neon question bank
  // ----------------------------------------------------
  app.get('/api/questions', async (req: Request, res: Response) => {
    try {
      const includeAll = req.query.status === 'all';
      if (includeAll) await requireAdmin(req);

      const result = await pool.query(
        `SELECT id, subject_id, topic, difficulty, year, passage, question_text, image_url,
          option_a, option_b, option_c, option_d, correct_answer, explanation, status,
          created_by, reviewed_by, review_notes, source, syllabus_reference, created_at, updated_at
         FROM questions
         ${includeAll ? '' : "WHERE status = 'approved'"}
         ORDER BY updated_at DESC, created_at DESC`,
      );

      return res.json({
        success: true,
        questions: result.rows.map(questionFromRow),
      });
    } catch (error: any) {
      return respondWithError(res, error, 'Unable to load questions from Neon.');
    }
  });

  app.post('/api/questions/generate', async (req: Request, res: Response) => {
    try {
      const admin = await requireAdmin(req);
      const subjectId = typeof req.body?.subjectId === 'string' ? req.body.subjectId.trim() : '';
      const topic = typeof req.body?.topic === 'string' ? req.body.topic.trim() : '';
      const difficulty = typeof req.body?.difficulty === 'string' ? req.body.difficulty.trim() : '';
      const count = Number(req.body?.count);
      const subject = JAMB_SUBJECTS.find(item => item.id === subjectId);

      if (!subject || !SUBJECT_TOPICS[subjectId]?.includes(topic)) {
        throw new HttpError(400, 'Select a subject and topic from the JAMB syllabus catalog.');
      }
      if (!QUESTION_DIFFICULTIES.includes(difficulty as typeof QUESTION_DIFFICULTIES[number])) {
        throw new HttpError(400, 'Select easy, medium, or hard difficulty.');
      }
      if (!Number.isInteger(count) || count < 1 || count > 50) {
        throw new HttpError(400, 'Question count must be a whole number from 1 to 50.');
      }

      const questions = await generateQuestionDrafts(subjectId, topic, difficulty, count, admin.name);
      return res.json({
        success: true,
        questions,
        message: 'AI drafts generated for admin review. Nothing has been saved to Neon yet.',
      });
    } catch (error: any) {
      return respondWithError(res, error, 'Unable to generate question drafts.');
    }
  });

  app.post('/api/questions', async (req: Request, res: Response) => {
    try {
      const admin = await requireAdmin(req);
      const question = normalizeQuestionPayload(req.body);
      question.createdBy = question.source === 'ai_generated' ? `${admin.name} · AI draft` : admin.name;
      const result = await pool.query(
        `INSERT INTO questions (
          id, subject_id, topic, difficulty, year, passage, question_text, image_url,
          option_a, option_b, option_c, option_d, correct_answer, explanation, status,
          created_by, reviewed_by, review_notes, source, syllabus_reference, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW())
        ON CONFLICT (id) DO UPDATE SET
          subject_id = EXCLUDED.subject_id,
          topic = EXCLUDED.topic,
          difficulty = EXCLUDED.difficulty,
          year = EXCLUDED.year,
          passage = EXCLUDED.passage,
          question_text = EXCLUDED.question_text,
          image_url = EXCLUDED.image_url,
          option_a = EXCLUDED.option_a,
          option_b = EXCLUDED.option_b,
          option_c = EXCLUDED.option_c,
          option_d = EXCLUDED.option_d,
          correct_answer = EXCLUDED.correct_answer,
          explanation = EXCLUDED.explanation,
          status = EXCLUDED.status,
          reviewed_by = EXCLUDED.reviewed_by,
          review_notes = EXCLUDED.review_notes,
          source = EXCLUDED.source,
          syllabus_reference = EXCLUDED.syllabus_reference,
          updated_at = NOW()
        RETURNING id, subject_id, topic, difficulty, year, passage, question_text, image_url,
          option_a, option_b, option_c, option_d, correct_answer, explanation, status,
          created_by, reviewed_by, review_notes, source, syllabus_reference, created_at, updated_at`,
        [
          question.id,
          question.subjectId,
          question.topic,
          question.difficulty,
          question.year,
          question.passage,
          question.questionText,
          question.imageUrl,
          question.options.A,
          question.options.B,
          question.options.C,
          question.options.D,
          question.correctAnswer,
          question.explanation,
          question.status,
          question.createdBy || admin.name,
          question.reviewedBy,
          question.reviewNotes,
          question.source,
          question.syllabusReference,
        ],
      );

      return res.status(201).json({ success: true, question: questionFromRow(result.rows[0]) });
    } catch (error: any) {
      return respondWithError(res, error, 'Unable to save question to Neon.');
    }
  });

  app.put('/api/questions/:id', async (req: Request, res: Response) => {
    try {
      await requireAdmin(req);
      const question = normalizeQuestionPayload({ ...req.body, id: req.params.id });
      const result = await pool.query(
        `UPDATE questions SET
          subject_id = $2, topic = $3, difficulty = $4, year = $5, passage = $6,
          question_text = $7, image_url = $8, option_a = $9, option_b = $10,
          option_c = $11, option_d = $12, correct_answer = $13, explanation = $14,
          status = $15, reviewed_by = $16, review_notes = $17, source = $18,
          syllabus_reference = $19, updated_at = NOW()
         WHERE id = $1
         RETURNING id, subject_id, topic, difficulty, year, passage, question_text, image_url,
          option_a, option_b, option_c, option_d, correct_answer, explanation, status,
          created_by, reviewed_by, review_notes, source, syllabus_reference, created_at, updated_at`,
        [
          question.id,
          question.subjectId,
          question.topic,
          question.difficulty,
          question.year,
          question.passage,
          question.questionText,
          question.imageUrl,
          question.options.A,
          question.options.B,
          question.options.C,
          question.options.D,
          question.correctAnswer,
          question.explanation,
          question.status,
          question.reviewedBy,
          question.reviewNotes,
          question.source,
          question.syllabusReference,
        ],
      );

      if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Question not found.' });
      return res.json({ success: true, question: questionFromRow(result.rows[0]) });
    } catch (error: any) {
      return respondWithError(res, error, 'Unable to update question in Neon.');
    }
  });

  app.patch('/api/questions/:id/status', async (req: Request, res: Response) => {
    try {
      const admin = await requireAdmin(req);
      const status = req.body?.status;
      if (!QUESTION_STATUSES.includes(status)) {
        throw new HttpError(400, 'Invalid question status.');
      }

      const result = await pool.query(
        `UPDATE questions SET
          status = $2,
          reviewed_by = $3,
          review_notes = $4,
          updated_at = NOW()
         WHERE id = $1
         RETURNING id, subject_id, topic, difficulty, year, passage, question_text, image_url,
          option_a, option_b, option_c, option_d, correct_answer, explanation, status,
          created_by, reviewed_by, review_notes, source, syllabus_reference, created_at, updated_at`,
        [
          req.params.id,
          status,
          admin.name,
          typeof req.body?.reviewNotes === 'string' ? req.body.reviewNotes.trim() || null : null,
        ],
      );

      if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Question not found.' });
      return res.json({ success: true, question: questionFromRow(result.rows[0]) });
    } catch (error: any) {
      return respondWithError(res, error, 'Unable to update question status in Neon.');
    }
  });

  app.delete('/api/questions/:id', async (req: Request, res: Response) => {
    try {
      await requireAdmin(req);
      await pool.query('DELETE FROM questions WHERE id = $1', [req.params.id]);
      return res.json({ success: true });
    } catch (error: any) {
      return respondWithError(res, error, 'Unable to delete question from Neon.');
    }
  });

  // ----------------------------------------------------
  // 6. Save Completed Test Session to Neon
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

  return app;
}

async function startServer() {
  const app = await createApiApp();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // ----------------------------------------------------
  // 7. Vite Frontend Middleware or Static Assets
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
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

if (process.env.VERCEL !== '1') {
  void startServer();
}

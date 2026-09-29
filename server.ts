import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { JAMB_SUBJECTS, JAMB_SYLLABUS_SOURCE_URL, SUBJECT_TOPICS } from './src/data/subjects.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Neon still provides Postgres, while Supabase Auth owns identity and sessions.
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

const pool = new Pool({
  connectionString: NEON_PG_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY
  || process.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || process.env.VITE_SUPABASE_ANON_KEY
  || '';

const SESSION_COOKIE_NAME = 'sameduhub_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const PASSWORD_HASH_KEY_LENGTH = 64;
const PASSWORD_HASH_COST = 16384;
const configuredAdminEmails = new Set(
  (process.env.AUTH_ADMIN_EMAILS || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean),
);

type DatabaseExecutor = Pick<Pool, 'query'>;
type SessionIdentity = {
  sub: string;
  email: string;
  name: string;
  role: string;
  user: any;
};

const deriveScryptKey = (password: string, salt: Buffer, keyLength: number) =>
  new Promise<Buffer>((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      keyLength,
      { N: PASSWORD_HASH_COST, r: 8, p: 1 },
      (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey as Buffer);
      },
    );
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
const QUESTION_GENERATION_DIFFICULTIES = [...QUESTION_DIFFICULTIES, 'mixed'] as const;
const QUESTION_GENERATION_SCOPES = ['topic', 'whole_subject'] as const;
const QUESTION_OPTION_KEYS = ['A', 'B', 'C', 'D'] as const;

// Initialize database tables if not already present
async function initNeonDatabase() {
  try {
    await pool.query(`
      -- Application-owned identity. Passwords are stored as scrypt hashes only.
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(32) NOT NULL DEFAULT 'student',
        password_hash TEXT,
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
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS supabase_user_id VARCHAR(128);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_supabase_user_id
        ON users(supabase_user_id)
        WHERE supabase_user_id IS NOT NULL;

      CREATE TABLE IF NOT EXISTS auth_sessions (
        token_hash CHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_auth_sessions_expiry ON auth_sessions(expires_at);

      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        token_hash CHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expiry ON password_reset_tokens(expires_at);

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

function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = await deriveScryptKey(password, salt, PASSWORD_HASH_KEY_LENGTH);
  return `scrypt$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

async function verifyPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash) return false;

  const [algorithm, saltHex, hashHex] = storedHash.split('$');
  if (algorithm !== 'scrypt' || !saltHex || !hashHex || !/^[a-f0-9]+$/i.test(saltHex) || !/^[a-f0-9]+$/i.test(hashHex)) {
    return false;
  }

  const expected = Buffer.from(hashHex, 'hex');
  const actual = await deriveScryptKey(password, Buffer.from(saltHex, 'hex'), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function parseCookies(req: Request) {
  const cookies: Record<string, string> = {};
  for (const part of (req.header('cookie') || '').split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

function getSessionToken(req: Request) {
  const cookieToken = parseCookies(req)[SESSION_COOKIE_NAME];
  if (cookieToken) return cookieToken;

  const authorization = req.header('authorization');
  return authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : '';
}

function setSessionCookie(res: Response, token: string) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; HttpOnly; SameSite=Lax${secure}`,
  );
}

function clearSessionCookie(res: Response) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`,
  );
}

async function createSession(userId: string, res: Response, executor: DatabaseExecutor = pool) {
  const token = randomBytes(32).toString('base64url');
  await executor.query(
    `INSERT INTO auth_sessions (token_hash, user_id, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
    [hashSessionToken(token), userId],
  );
  setSessionCookie(res, token);
}

function getSupabaseAccessToken(req: Request) {
  const authorization = req.header('authorization') || '';
  return authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : '';
}

async function getSupabaseUser(accessToken: string) {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new HttpError(503, 'Supabase Auth is not configured on the server.');
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Accept: 'application/json',
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new HttpError(401, 'Invalid or expired Supabase session.');
  }

  return await response.json() as {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  };
}

async function ensureSupabaseProfile(authUser: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}) {
  const email = (authUser.email || '').trim().toLowerCase();
  if (!email) throw new HttpError(401, 'Your Supabase account has no email address.');

  const metadata = authUser.user_metadata || {};
  const name = typeof metadata.full_name === 'string' && metadata.full_name.trim()
    ? metadata.full_name.trim()
    : typeof metadata.name === 'string' && metadata.name.trim()
    ? metadata.name.trim()
    : email.split('@')[0];
  const jambRegNumber = typeof metadata.jamb_reg_number === 'string' ? metadata.jamb_reg_number.trim().toUpperCase() : '';
  const targetScore = Number(metadata.target_score);
  const selectedSubjects = Array.isArray(metadata.selected_subjects)
    ? metadata.selected_subjects.filter((subject: unknown): subject is string => typeof subject === 'string').slice(0, 4)
    : [];

  const existing = await pool.query(
    `SELECT
       id,
       name,
       email,
       role,
       jamb_reg_number AS "jambRegNumber",
       target_score AS "targetScore",
       avatar_url AS "avatarUrl",
       selected_subjects AS "selectedSubjects",
       created_at AS "createdAt",
       supabase_user_id AS "supabaseUserId"
     FROM users
     WHERE supabase_user_id = $1 OR lower(email) = $2
     ORDER BY CASE WHEN supabase_user_id = $1 THEN 0 ELSE 1 END
     LIMIT 1`,
    [authUser.id, email],
  );

  if (existing.rows[0]) {
    const row = existing.rows[0];
    const shouldBeAdmin = configuredAdminEmails.has(email);
    if (row.supabaseUserId !== authUser.id || (shouldBeAdmin && row.role !== 'admin')) {
      await pool.query(
        `UPDATE users
         SET supabase_user_id = $1,
             email = $2,
             role = CASE WHEN $4 THEN 'admin' ELSE role END
         WHERE id = $3`,
        [authUser.id, email, row.id, shouldBeAdmin],
      );
      row.supabaseUserId = authUser.id;
      row.email = email;
      if (shouldBeAdmin) row.role = 'admin';
    }
    return row;
  }

  const role = configuredAdminEmails.has(email) ? 'admin' : 'student';
  try {
    const result = await pool.query(
      `INSERT INTO users (
         id, name, email, role, supabase_user_id, jamb_reg_number,
         target_score, avatar_url, selected_subjects
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
        authUser.id,
        name.slice(0, 255),
        email,
        role,
        authUser.id,
        jambRegNumber || `2026/UTME/${Math.floor(100000 + Math.random() * 900000)}`,
        Number.isFinite(targetScore) && targetScore >= 200 && targetScore <= 400 ? Math.round(targetScore) : 320,
        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
        selectedSubjects.length > 0 ? selectedSubjects : ['english', 'mathematics', 'physics', 'chemistry'],
      ],
    );

    return result.rows[0];
  } catch (error: any) {
    // Sign-in and session restoration can ask for the profile concurrently.
    // If another request created it first, read that row instead of returning
    // a misleading generic profile-load error to the browser.
    if (error?.code !== '23505') throw error;

    const retry = await pool.query(
      `SELECT
         id,
         name,
         email,
         role,
         jamb_reg_number AS "jambRegNumber",
         target_score AS "targetScore",
         avatar_url AS "avatarUrl",
         selected_subjects AS "selectedSubjects",
         created_at AS "createdAt",
         supabase_user_id AS "supabaseUserId"
       FROM users
       WHERE supabase_user_id = $1 OR lower(email) = $2
       ORDER BY CASE WHEN supabase_user_id = $1 THEN 0 ELSE 1 END
       LIMIT 1`,
      [authUser.id, email],
    );

    if (retry.rows[0]) {
      const row = retry.rows[0];
      const shouldBeAdmin = configuredAdminEmails.has(email);
      if (row.supabaseUserId !== authUser.id || (shouldBeAdmin && row.role !== 'admin')) {
        await pool.query(
          `UPDATE users
           SET supabase_user_id = $1,
               email = $2,
               role = CASE WHEN $4 THEN 'admin' ELSE role END
           WHERE id = $3`,
          [authUser.id, email, row.id, shouldBeAdmin],
        );
        row.supabaseUserId = authUser.id;
        row.email = email;
        if (shouldBeAdmin) row.role = 'admin';
      }
      return row;
    }

    throw error;
  }
}

async function authenticateRequest(req: Request): Promise<SessionIdentity> {
  const token = getSupabaseAccessToken(req);
  if (!token) throw new HttpError(401, 'Supabase session required.');

  const authUser = await getSupabaseUser(token);
  const row = await ensureSupabaseProfile(authUser);
  const user = profileFromRow(row);
  return {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    user,
  };
}

async function deleteSession(req: Request) {
  const token = getSessionToken(req);
  if (token) {
    await pool.query('DELETE FROM auth_sessions WHERE token_hash = $1', [hashSessionToken(token)]);
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character] || character);
}

async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.AUTH_EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    throw new HttpError(503, 'Password reset email service is unavailable. Configure RESEND_API_KEY and AUTH_EMAIL_FROM.');
  }

  const safeName = escapeHtml(name || 'Candidate');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'Reset your SamEduHub password',
      html: `<p>Hello ${safeName},</p>
        <p>We received a request to reset your SamEduHub password.</p>
        <p><a href="${resetUrl}">Reset your password</a></p>
        <p>This link expires in one hour and can only be used once. If you did not request this, you can ignore this email.</p>`,
      text: `Hello ${name || 'Candidate'},\n\nReset your SamEduHub password here: ${resetUrl}\n\nThis link expires in one hour and can only be used once.`,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    console.error('[App Auth Email Error]', response.status, details);
    throw new HttpError(502, 'Unable to send the password reset email.');
  }
}

function sendUnauthorized(res: Response, error = 'App session required.') {
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

function normalizeSyllabusLabel(value: string) {
  return value.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function buildTopicPlan(topics: string[], count: number) {
  return Array.from({ length: count }, (_, index) => topics[index % topics.length]);
}

function balancedDifficultyAt(index: number, count: number) {
  const position = index / Math.max(1, count);
  if (position < 0.25) return 'easy';
  if (position < 0.75) return 'medium';
  return 'hard';
}

async function generateQuestionDrafts(
  subjectId: string,
  topic: string,
  difficulty: string,
  count: number,
  createdBy: string,
  scope: typeof QUESTION_GENERATION_SCOPES[number] = 'topic',
) {
  if (!process.env.GEMINI_API_KEY) {
    throw new HttpError(503, 'Question generation is not configured. Add GEMINI_API_KEY to the server environment.');
  }

  const subject = JAMB_SUBJECTS.find(item => item.id === subjectId);
  if (!subject) throw new HttpError(400, 'Select a valid JAMB subject.');

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const syllabusTopics = SUBJECT_TOPICS[subjectId] || [];
  if (syllabusTopics.length === 0) throw new HttpError(400, 'This subject has no syllabus topics configured yet.');

  const wholeSubject = scope === 'whole_subject';
  const topicPlan = buildTopicPlan(wholeSubject ? syllabusTopics : [topic], count);
  const coveragePlan = topicPlan.map((plannedTopic, index) => `${index + 1}. ${plannedTopic}`).join('\n');
  const difficultyInstructions = difficulty === 'mixed'
    ? 'Use a balanced JAMB-style mix: approximately 25% easy, 50% medium, and 25% hard. Include the actual difficulty for every item.'
    : `Every item must have difficulty "${difficulty}".`;
  const prompt = `
You are a careful Nigerian UTME/JAMB practice-question writer.

Create exactly ${count} original multiple-choice practice questions for:
- Subject: ${subject.name}
- Coverage: ${wholeSubject ? 'the entire subject syllabus' : `the single topic "${topic}"`}
- Requested difficulty: ${difficulty}
- Subject scope: ${subject.description}
- Available syllabus topic labels in this app: ${syllabusTopics.join('; ')}

Use the JAMB Integrated Brochure and Syllabus System (IBASS) as the syllabus reference: ${JAMB_SYLLABUS_SOURCE_URL}
Stay within the selected subject and the supplied syllabus topic labels. Do not invent a topic outside that scope.
These are original practice questions, NOT official JAMB questions. Do not claim that JAMB authored, endorsed, or previously used them, and do not reproduce past questions verbatim.
Write realistic CBT items appropriate for the Nigerian senior-secondary curriculum. Use calculations, interpretation, application, and recall where appropriate for the subject. For Use of English, use a passage only when the question genuinely tests comprehension or summary. Keep passages and explanations concise.
${difficultyInstructions}

Coverage plan (return the questions in this exact order and set each item's topic to the matching label):
${coveragePlan}

Return only valid JSON: an array of exactly ${count} objects. Each object must have:
topic (exactly one supplied syllabus label), difficulty (exactly one of easy, medium, hard), questionText (string), passage (string or empty string), options (object with exactly A, B, C, D string values), correctAnswer (exactly one of A/B/C/D), and explanation (string).
Each question must have four distinct options, exactly one defensible correct answer, and an explanation that teaches the reasoning. Avoid duplicate stems, repeated numerical values, answer-pattern bias, and ambiguous wording.
`.trim();

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    contents: prompt,
    config: {
        temperature: 0.55,
        maxOutputTokens: Math.min(65536, 1800 + count * 560),
      responseMimeType: 'application/json',
        tools: [{ googleSearch: {} }],
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

  const seenStems = new Set<string>();
  const drafts = rawQuestions
    .map((item, index) => {
      const options = item?.options || {};
      const normalizedOptions = Array.isArray(options)
        ? { A: options[0], B: options[1], C: options[2], D: options[3] }
        : options;
      const questionText = typeof item?.questionText === 'string' ? item.questionText.trim() : '';
      const correctAnswer = typeof item?.correctAnswer === 'string'
        ? item.correctAnswer.trim().toUpperCase()
        : '';
      const optionValues = QUESTION_OPTION_KEYS.map(key => String(normalizedOptions[key] || '').trim());
      const stemKey = normalizeSyllabusLabel(questionText);
      const validDifficulty = difficulty === 'mixed'
        ? QUESTION_DIFFICULTIES.includes(item?.difficulty)
          ? item.difficulty
          : balancedDifficultyAt(index, count)
        : difficulty;
      const valid = questionText
        && optionValues.every(Boolean)
        && new Set(optionValues.map(value => value.toLowerCase())).size === 4
        && QUESTION_OPTION_KEYS.includes(correctAnswer)
        && typeof item?.explanation === 'string'
        && item.explanation.trim()
        && !seenStems.has(stemKey);

      if (!valid) return null;
      seenStems.add(stemKey);

      const now = new Date().toISOString();
      return {
        id: `ai-draft-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
        subjectId,
        topic: topicPlan[index] || topic,
        difficulty: validDifficulty,
        passage: typeof item.passage === 'string' && item.passage.trim() ? item.passage.trim() : undefined,
        questionText,
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
    throw new HttpError(502, `The model returned ${drafts.length} valid questions instead of ${count}. Try generating this batch again.`);
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
  // 2. Application-owned authentication
  // ----------------------------------------------------
  app.post('/api/auth/signup', async (req: Request, res: Response) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const jambRegNumber = typeof req.body?.jambRegNumber === 'string'
      ? req.body.jambRegNumber.trim().toUpperCase()
      : '';
    const selectedSubjects = Array.isArray(req.body?.selectedSubjects)
      ? req.body.selectedSubjects.filter((subject: unknown): subject is string => typeof subject === 'string').slice(0, 4)
      : [];
    const targetScore = Number(req.body?.targetScore);

    if (name.length < 2 || name.length > 255) {
      return res.status(400).json({ success: false, error: 'Enter a valid full name.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'Enter a valid email address.' });
    }
    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({ success: false, error: 'Password must be 8 to 128 characters.' });
    }

    const finalSubjects = selectedSubjects.length > 0
      ? selectedSubjects
      : ['english', 'mathematics', 'physics', 'chemistry'];
    const finalScore = Number.isFinite(targetScore) && targetScore >= 200 && targetScore <= 400
      ? Math.round(targetScore)
      : 320;
    const finalReg = jambRegNumber || `2026/UTME/${Math.floor(100000 + Math.random() * 900000)}`;
    const userId = `usr-${randomUUID()}`;
    const role = configuredAdminEmails.has(email) ? 'admin' : 'student';
    const passwordHash = await hashPassword(password);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const result = await client.query(
        `INSERT INTO users (
          id, name, email, role, password_hash, jamb_reg_number, target_score, avatar_url, selected_subjects
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
          userId,
          name,
          email,
          role,
          passwordHash,
          finalReg,
          finalScore,
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
          finalSubjects,
        ],
      );
      await client.query('COMMIT');

      await createSession(userId, res);
      return res.status(201).json({
        success: true,
        user: profileFromRow(result.rows[0]),
        message: 'Account created successfully.',
      });
    } catch (error: any) {
      await client.query('ROLLBACK').catch(() => undefined);
      if (error?.code === '23505') {
        return res.status(409).json({ success: false, error: 'An account with that email already exists.' });
      }
      console.error('[App Auth Signup Error]', error?.message || error);
      return res.status(500).json({ success: false, error: 'Unable to create your account.' });
    } finally {
      client.release();
    }
  });

  app.post(['/api/auth/signin', '/api/auth/login'], async (req: Request, res: Response) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    try {
      const result = await pool.query(
        `SELECT
          id,
          name,
          email,
          role,
          password_hash,
          jamb_reg_number AS "jambRegNumber",
          target_score AS "targetScore",
          avatar_url AS "avatarUrl",
          selected_subjects AS "selectedSubjects",
          created_at AS "createdAt"
         FROM users
         WHERE lower(email) = $1
         LIMIT 1`,
        [email],
      );
      const row = result.rows[0];
      const passwordMatches = await verifyPassword(password, row?.password_hash);

      if (!row || !passwordMatches) {
        return res.status(401).json({ success: false, error: 'Invalid email or password.' });
      }

      await pool.query('DELETE FROM auth_sessions WHERE expires_at <= NOW()');
      await createSession(row.id, res);
      return res.json({ success: true, user: profileFromRow(row), message: 'Signed in successfully.' });
    } catch (error: any) {
      console.error('[App Auth Signin Error]', error?.message || error);
      return res.status(500).json({ success: false, error: 'Unable to sign you in.' });
    }
  });

  app.get('/api/auth/session', async (req: Request, res: Response) => {
    try {
      const authUser = await authenticateRequest(req);
      return res.json({ success: true, user: authUser.user });
    } catch (error: any) {
      if (error instanceof HttpError) return sendUnauthorized(res, error.message);
      console.error('[App Auth Session Error]', error?.message || error);
      return res.status(500).json({ success: false, error: 'Unable to restore your session.' });
    }
  });

  app.post('/api/auth/signout', async (req: Request, res: Response) => {
    try {
      await deleteSession(req);
    } catch (error: any) {
      console.error('[App Auth Signout Error]', error?.message || error);
    }
    clearSessionCookie(res);
    return res.json({ success: true, message: 'Signed out successfully.' });
  });

  app.post('/api/auth/password-reset/request', async (req: Request, res: Response) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }

    try {
      const result = await pool.query(
        'SELECT id, name, email FROM users WHERE lower(email) = $1 LIMIT 1',
        [email],
      );
      const user = result.rows[0];

      // Keep the response generic so the endpoint does not reveal whether an
      // email address belongs to an account.
      if (!user) {
        return res.json({
          success: true,
          message: 'If an account exists for that email, a reset link has been sent.',
        });
      }

      const rawToken = randomBytes(32).toString('base64url');
      const tokenHash = hashSessionToken(rawToken);
      await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);
      await pool.query(
        `INSERT INTO password_reset_tokens (token_hash, user_id, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
        [tokenHash, user.id],
      );

      const configuredAppUrl = process.env.APP_URL?.trim().replace(/\/$/, '');
      const appUrl = configuredAppUrl || `${req.protocol}://${req.get('host')}`;
      const resetUrl = `${appUrl}/?resetToken=${encodeURIComponent(rawToken)}`;

      try {
        await sendPasswordResetEmail(user.email, user.name, resetUrl);
      } catch (emailError) {
        await pool.query('DELETE FROM password_reset_tokens WHERE token_hash = $1', [tokenHash]);
        throw emailError;
      }

      return res.json({
        success: true,
        message: 'If an account exists for that email, a reset link has been sent.',
      });
    } catch (error: any) {
      if (error instanceof HttpError) {
        return res.status(error.statusCode).json({ success: false, error: error.message });
      }
      console.error('[App Password Reset Request Error]', error?.message || error);
      return res.status(500).json({ success: false, error: 'Unable to request a password reset.' });
    }
  });

  app.post('/api/auth/password-reset/confirm', async (req: Request, res: Response) => {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    if (!token || newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({ success: false, error: 'A valid reset token and an 8–128 character password are required.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `SELECT user_id
         FROM password_reset_tokens
         WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
         FOR UPDATE`,
        [hashSessionToken(token)],
      );
      const resetToken = result.rows[0];
      if (!resetToken) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, error: 'This password reset link is invalid or has expired.' });
      }

      const passwordHash = await hashPassword(newPassword);
      await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, resetToken.user_id]);
      await client.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = $1', [hashSessionToken(token)]);
      await client.query('DELETE FROM auth_sessions WHERE user_id = $1', [resetToken.user_id]);
      await client.query('COMMIT');
      clearSessionCookie(res);
      return res.json({ success: true, message: 'Password updated. You can now sign in.' });
    } catch (error: any) {
      await client.query('ROLLBACK').catch(() => undefined);
      console.error('[App Password Reset Confirm Error]', error?.message || error);
      return res.status(500).json({ success: false, error: 'Unable to update your password.' });
    } finally {
      client.release();
    }
  });

  // ----------------------------------------------------
  // 3. Candidate profile linked to the application session
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
      if (error instanceof HttpError) {
        return sendUnauthorized(res, error.message);
      }
      console.error('[App Profile Read Error]', error.message);
      return res.status(500).json({ success: false, error: 'Unable to load your profile.' });
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
        return sendUnauthorized(res, 'Profile email must match the signed-in account.');
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
        message: 'Candidate profile saved.',
      });
    } catch (error: any) {
      if (error instanceof HttpError) {
        return sendUnauthorized(res, error.message);
      }
      if (error.code === '23505') {
        return res.status(409).json({
          success: false,
          error: 'That email or JAMB registration number is already linked to another profile.',
        });
      }
      console.error('[App Profile Write Error]', error.message);
      return res.status(500).json({ success: false, error: 'Unable to save your profile.' });
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
      return respondWithError(res, error, 'Unable to load questions.');
    }
  });

  app.post('/api/questions/generate', async (req: Request, res: Response) => {
    try {
      const admin = await requireAdmin(req);
      const subjectId = typeof req.body?.subjectId === 'string' ? req.body.subjectId.trim() : '';
      const topic = typeof req.body?.topic === 'string' ? req.body.topic.trim() : '';
      const difficulty = typeof req.body?.difficulty === 'string' ? req.body.difficulty.trim() : '';
      const scope = typeof req.body?.scope === 'string' ? req.body.scope.trim() : 'topic';
      const count = Number(req.body?.count);
      const subject = JAMB_SUBJECTS.find(item => item.id === subjectId);

      if (!subject || !QUESTION_GENERATION_SCOPES.includes(scope as typeof QUESTION_GENERATION_SCOPES[number])) {
        throw new HttpError(400, 'Select a valid JAMB subject and question scope.');
      }
      if (scope === 'topic' && !SUBJECT_TOPICS[subjectId]?.includes(topic)) {
        throw new HttpError(400, 'Select a topic from the JAMB syllabus catalog.');
      }
      if (!QUESTION_GENERATION_DIFFICULTIES.includes(difficulty as typeof QUESTION_GENERATION_DIFFICULTIES[number])) {
        throw new HttpError(400, 'Select easy, medium, hard, or balanced difficulty.');
      }
      if (!Number.isInteger(count) || count < 1 || count > 60) {
        throw new HttpError(400, 'Question count must be a whole number from 1 to 60.');
      }

      const questions = await generateQuestionDrafts(
        subjectId,
        topic,
        difficulty,
        count,
        admin.name,
        scope as typeof QUESTION_GENERATION_SCOPES[number],
      );
      return res.json({
        success: true,
        questions,
        message: `Generated ${questions.length} AI practice drafts across ${scope === 'whole_subject' ? 'the full subject syllabus' : 'the selected topic'}. Nothing has been saved yet.`,
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
      return respondWithError(res, error, 'Unable to save question.');
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
      return respondWithError(res, error, 'Unable to update question.');
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
      return respondWithError(res, error, 'Unable to update question status.');
    }
  });

  app.delete('/api/questions/:id', async (req: Request, res: Response) => {
    try {
      await requireAdmin(req);
      await pool.query('DELETE FROM questions WHERE id = $1', [req.params.id]);
      return res.json({ success: true });
    } catch (error: any) {
      return respondWithError(res, error, 'Unable to delete question.');
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
        return sendUnauthorized(res, 'You can only save sessions for your signed-in account.');
      }

      // The app session and user_id check above protect this write from cross-user saves.
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

      return res.json({ success: true, message: 'Session saved successfully.' });
    } catch (err: any) {
      if (err instanceof HttpError) {
        return sendUnauthorized(res, err.message);
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

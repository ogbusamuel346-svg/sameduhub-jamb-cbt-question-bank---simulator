import { Question, TestSession, NeonConfig, User } from '../types/index.ts';
import { INITIAL_QUESTIONS } from '../data/seedQuestions.ts';

const STORAGE_KEYS = {
  QUESTIONS: 'sam_eduhub_questions_v1',
  SESSIONS: 'sam_eduhub_test_sessions_v1',
  NEON_CONFIG: 'sam_eduhub_neon_config_v1',
  CUSTOM_TOPICS: 'sam_eduhub_custom_topics_v1',
};

export const GUEST_USER: User = {
  id: 'usr-guest',
  name: 'Candidate',
  email: 'candidate@sameduhub.ng',
  role: 'student',
  jambRegNumber: 'UNREGISTERED',
  selectedSubjects: ['english', 'mathematics', 'physics', 'chemistry'],
  targetScore: 300,
};

export const DEFAULT_NEON_CONFIG: NeonConfig = {
  connectionString: '',
  databaseName: 'neondb',
  host: 'Managed Neon branch',
  isConnected: false,
};

export const StorageService = {
  getQuestions(): Question[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
      if (!stored) {
        localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(INITIAL_QUESTIONS));
        return INITIAL_QUESTIONS;
      }
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(INITIAL_QUESTIONS));
        return INITIAL_QUESTIONS;
      }
      return parsed;
    } catch {
      return INITIAL_QUESTIONS;
    }
  },

  saveQuestions(questions: Question[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions));
    } catch (e) {
      console.error('Failed to save questions to localStorage', e);
    }
  },

  getTestSessions(): TestSession[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  saveTestSession(session: TestSession): void {
    try {
      const sessions = this.getTestSessions();
      const existingIdx = sessions.findIndex(s => s.id === session.id);
      if (existingIdx >= 0) {
        sessions[existingIdx] = session;
      } else {
        sessions.unshift(session);
      }
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    } catch (e) {
      console.error('Failed to save test session', e);
    }
  },

  getNeonConfig(): NeonConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.NEON_CONFIG);
      return stored ? JSON.parse(stored) : DEFAULT_NEON_CONFIG;
    } catch {
      return DEFAULT_NEON_CONFIG;
    }
  },

  saveNeonConfig(config: NeonConfig): void {
    try {
      localStorage.setItem(STORAGE_KEYS.NEON_CONFIG, JSON.stringify(config));
    } catch (e) {
      console.error('Failed to save Neon config', e);
    }
  },

  resetQuestionBank(): Question[] {
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(INITIAL_QUESTIONS));
    return INITIAL_QUESTIONS;
  },

  generatePostgreSqlSchema(): string {
    return `-- ========================================================
-- SamEduHub JAMB CBT PostgreSQL Schema for Neon
-- Compatible with Neon Serverless Postgres
-- ========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Candidate profiles and application-owned credentials
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'student' CHECK (role IN ('admin', 'reviewer', 'student')),
    password_hash TEXT,
    jamb_reg_number VARCHAR(64),
    target_score INT DEFAULT 300,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session tokens are random opaque values; only their SHA-256 hashes are stored.
CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash CHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Question Bank
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

-- 3. Student CBT Test Sessions
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
    final_percentage NUMERIC(5,2) NOT NULL,
    time_allowed_seconds INT NOT NULL,
    time_spent_seconds INT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'completed',
    subject_breakdown JSONB DEFAULT '[]'::jsonb,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_tests_user ON test_sessions(user_id);
`;
  },

  exportQuestionsAsSql(questions: Question[]): string {
    const lines = questions.map(q => {
      const escape = (val: string = '') => val.replace(/'/g, "''");
      return `INSERT INTO questions (id, subject_id, topic, difficulty, year, passage, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, status, created_by)
VALUES ('${q.id}', '${q.subjectId}', '${escape(q.topic)}', '${q.difficulty}', ${q.year || 'NULL'}, ${q.passage ? `'${escape(q.passage)}'` : 'NULL'}, '${escape(q.questionText)}', '${escape(q.options.A)}', '${escape(q.options.B)}', '${escape(q.options.C)}', '${escape(q.options.D)}', '${q.correctAnswer}', '${escape(q.explanation)}', '${q.status}', '${escape(q.createdBy)}')
ON CONFLICT (id) DO UPDATE SET question_text = EXCLUDED.question_text, explanation = EXCLUDED.explanation;`;
    });

    return `-- Neon PostgreSQL Seed Data for SamEduHub
-- Total Questions: ${questions.length}
-- Generated at: ${new Date().toISOString()}

BEGIN;
${lines.join('\n\n')}
COMMIT;`;
  }
};

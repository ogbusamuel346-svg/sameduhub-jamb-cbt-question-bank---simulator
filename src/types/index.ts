export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export type QuestionSource = 'manual' | 'ai_generated';
export type UserRole = 'admin' | 'reviewer' | 'student';
export type OptionKey = 'A' | 'B' | 'C' | 'D';

export interface Subject {
  id: string;
  name: string;
  code: string;
  icon: string;
  category: 'Science' | 'Arts' | 'Social Science' | 'General';
  description: string;
  defaultTimeMinutes: number;
}

export interface Topic {
  id: string;
  subjectId: string;
  name: string;
}

export interface Question {
  id: string;
  subjectId: string;
  topic: string;
  difficulty: Difficulty;
  year?: number;
  passage?: string; // For English comprehension or case studies
  questionText: string;
  imageUrl?: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: OptionKey;
  explanation: string;
  status: QuestionStatus;
  source?: QuestionSource;
  syllabusReference?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  jambRegNumber?: string;
  avatarUrl?: string;
  selectedSubjects?: string[];
  targetScore?: number;
}

export interface SubjectScoreBreakdown {
  subjectId: string;
  subjectName: string;
  score: number;
  totalQuestions: number;
  correctCount: number;
  percentage: number;
}

export interface TestSession {
  id: string;
  userId: string;
  userName: string;
  jambRegNumber: string;
  mode: 'full_jamb' | 'subject_practice' | 'topic_drill' | 'quick_mock';
  title: string;
  subjects: string[];
  questionIds: string[];
  answers: Record<string, OptionKey>;
  markedForReview: string[];
  startedAt: string;
  completedAt?: string;
  timeAllowedSeconds: number;
  timeSpentSeconds: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  score: number; // Raw correct answers
  totalQuestions: number;
  totalMaxScore: number; // e.g., 400 for Full JAMB
  finalPercentage: number;
  subjectBreakdown: SubjectScoreBreakdown[];
}

export interface NeonConfig {
  connectionString: string;
  databaseName: string;
  host: string;
  isConnected: boolean;
  lastTestedAt?: string;
  lastSyncedAt?: string;
}

import { GenerationDifficulty, Question, QuestionGenerationScope, QuestionStatus, User, TestSession } from '../types/index.ts';
import { getSupabaseAccessToken } from './auth.ts';

export interface NeonHealthResponse {
  success: boolean;
  isConnected: boolean;
  database?: string;
  host?: string;
  latencyMs?: number;
  userCount?: number;
  questionCount?: number;
  serverTime?: string;
  error?: string;
}

export interface AuthApiResponse {
  success: boolean;
  user?: User;
  message?: string;
  error?: string;
}

export interface ProfilePayload {
  name: string;
  email: string;
  jambRegNumber?: string;
  targetScore?: number;
  selectedSubjects?: string[];
}

export interface QuestionsApiResponse {
  success: boolean;
  questions: Question[];
  error?: string;
}

export interface QuestionApiResponse {
  success: boolean;
  question?: Question;
  error?: string;
}

export interface QuestionGenerationRequest {
  subjectId: string;
  topic: string;
  scope?: QuestionGenerationScope;
  difficulty: GenerationDifficulty;
  count: number;
}

async function authenticatedHeaders(): Promise<HeadersInit> {
  const accessToken = await getSupabaseAccessToken();
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

async function readResponse<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string; message?: string };
  if (!res.ok) {
    throw new Error(data.error || data.message || `The application service request failed (${res.status}).`);
  }
  return data;
}

export const NeonApiService = {
  async getHealth(): Promise<NeonHealthResponse> {
    try {
      const res = await fetch('/api/neon/health', {
        headers: { 'Accept': 'application/json' },
      });
      const data = await res.json();
      return data;
    } catch (err: any) {
      return {
        success: false,
        isConnected: false,
        error: err.message || 'Network error reaching the application service.',
      };
    }
  },

  async getProfile(): Promise<AuthApiResponse> {
    try {
      const res = await fetch('/api/auth/profile', {
        credentials: 'include',
        headers: await authenticatedHeaders(),
      });
      return await readResponse<AuthApiResponse>(res);
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Unable to load your profile.',
      };
    }
  },

  async saveProfile(profile: ProfilePayload): Promise<AuthApiResponse> {
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        credentials: 'include',
        headers: await authenticatedHeaders(),
        body: JSON.stringify(profile),
      });
      return await readResponse<AuthApiResponse>(res);
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Unable to save your profile.',
      };
    }
  },

  async getQuestions(includeAll = false): Promise<QuestionsApiResponse> {
    try {
      const query = includeAll ? '?status=all' : '?status=approved';
      const res = await fetch(`/api/questions${query}`, {
        credentials: includeAll ? 'include' : 'same-origin',
        headers: includeAll ? await authenticatedHeaders() : { Accept: 'application/json' },
      });
      return await readResponse<QuestionsApiResponse>(res);
    } catch (err: any) {
      return {
        success: false,
        questions: [],
        error: err.message || 'Unable to load questions.',
      };
    }
  },

  async generateQuestions(input: QuestionGenerationRequest): Promise<QuestionsApiResponse> {
    try {
      const res = await fetch('/api/questions/generate', {
        method: 'POST',
        credentials: 'include',
        headers: await authenticatedHeaders(),
        body: JSON.stringify(input),
      });
      return await readResponse<QuestionsApiResponse>(res);
    } catch (err: any) {
      return {
        success: false,
        questions: [],
        error: err.message || 'Unable to generate questions.',
      };
    }
  },

  async createQuestion(question: Question): Promise<QuestionApiResponse> {
    try {
      const res = await fetch('/api/questions', {
        method: 'POST',
        credentials: 'include',
        headers: await authenticatedHeaders(),
        body: JSON.stringify(question),
      });
      return await readResponse<QuestionApiResponse>(res);
    } catch (err: any) {
      return { success: false, error: err.message || 'Unable to save question.' };
    }
  },

  async updateQuestion(question: Question): Promise<QuestionApiResponse> {
    try {
      const res = await fetch(`/api/questions/${encodeURIComponent(question.id)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: await authenticatedHeaders(),
        body: JSON.stringify(question),
      });
      return await readResponse<QuestionApiResponse>(res);
    } catch (err: any) {
      return { success: false, error: err.message || 'Unable to update question.' };
    }
  },

  async updateQuestionStatus(
    id: string,
    status: QuestionStatus,
    reviewNotes?: string,
  ): Promise<QuestionApiResponse> {
    try {
      const res = await fetch(`/api/questions/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: await authenticatedHeaders(),
        body: JSON.stringify({ status, reviewNotes }),
      });
      return await readResponse<QuestionApiResponse>(res);
    } catch (err: any) {
      return { success: false, error: err.message || 'Unable to update question status.' };
    }
  },

  async deleteQuestion(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch(`/api/questions/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: await authenticatedHeaders(),
      });
      return await readResponse<{ success: boolean; error?: string }>(res);
    } catch (err: any) {
      return { success: false, error: err.message || 'Unable to delete question.' };
    }
  },

  async saveSession(session: TestSession): Promise<boolean> {
    try {
      const res = await fetch('/api/test-sessions', {
        method: 'POST',
        credentials: 'include',
        headers: await authenticatedHeaders(),
        body: JSON.stringify(session),
      });
      const data = await readResponse<{ success: boolean }>(res);
      return !!data.success;
    } catch (error) {
      console.warn('Unable to save completed session:', error);
      return false;
    }
  }
};

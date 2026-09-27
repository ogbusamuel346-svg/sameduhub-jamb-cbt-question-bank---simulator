import { User, TestSession } from '../types/index.ts';
import { getNeonAuthToken } from './neonAuth.ts';

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

async function authenticatedHeaders(): Promise<HeadersInit> {
  const token = await getNeonAuthToken();
  if (!token) {
    throw new Error('Your Neon Auth session has expired. Please sign in again.');
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

async function readResponse<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string; message?: string };
  if (!res.ok) {
    throw new Error(data.error || data.message || `Neon API request failed (${res.status}).`);
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
        error: err.message || 'Network error reaching Neon proxy',
      };
    }
  },

  async getProfile(): Promise<AuthApiResponse> {
    try {
      const res = await fetch('/api/auth/profile', {
        headers: await authenticatedHeaders(),
      });
      return await readResponse<AuthApiResponse>(res);
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Unable to load your Neon profile.',
      };
    }
  },

  async saveProfile(profile: ProfilePayload): Promise<AuthApiResponse> {
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: await authenticatedHeaders(),
        body: JSON.stringify(profile),
      });
      return await readResponse<AuthApiResponse>(res);
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Unable to save your Neon profile.',
      };
    }
  },

  async saveSession(session: TestSession): Promise<boolean> {
    try {
      const res = await fetch('/api/test-sessions', {
        method: 'POST',
        headers: await authenticatedHeaders(),
        body: JSON.stringify(session),
      });
      const data = await readResponse<{ success: boolean }>(res);
      return !!data.success;
    } catch (error) {
      console.warn('Unable to save session to Neon:', error);
      return false;
    }
  }
};

import { User } from '../types/index.ts';

export interface AuthApiResponse {
  success: boolean;
  user?: User;
  message?: string;
  error?: string;
}

async function readResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string; message?: string };
  if (!response.ok) {
    throw new Error(data.error || data.message || `Authentication request failed (${response.status}).`);
  }
  return data;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  return readResponse<T>(response);
}

export const AuthService = {
  async getSession(): Promise<AuthApiResponse> {
    try {
      return await request<AuthApiResponse>('/api/auth/session');
    } catch (error: any) {
      return { success: false, error: error?.message || 'Unable to restore your session.' };
    }
  },

  async signIn(email: string, password: string): Promise<AuthApiResponse> {
    try {
      return await request<AuthApiResponse>('/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    } catch (error: any) {
      return { success: false, error: error?.message || 'Unable to sign you in.' };
    }
  },

  async signUp(data: {
    name: string;
    email: string;
    password: string;
    jambRegNumber?: string;
    targetScore?: number;
    selectedSubjects?: string[];
  }): Promise<AuthApiResponse> {
    try {
      return await request<AuthApiResponse>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error: any) {
      return { success: false, error: error?.message || 'Unable to create your account.' };
    }
  },

  async signOut(): Promise<AuthApiResponse> {
    try {
      return await request<AuthApiResponse>('/api/auth/signout', { method: 'POST' });
    } catch (error: any) {
      return { success: false, error: error?.message || 'Unable to sign you out.' };
    }
  },

  async requestPasswordReset(email: string): Promise<AuthApiResponse> {
    try {
      return await request<AuthApiResponse>('/api/auth/password-reset/request', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    } catch (error: any) {
      return { success: false, error: error?.message || 'Password reset is unavailable.' };
    }
  },

  async confirmPasswordReset(token: string, newPassword: string): Promise<AuthApiResponse> {
    try {
      return await request<AuthApiResponse>('/api/auth/password-reset/confirm', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });
    } catch (error: any) {
      return { success: false, error: error?.message || 'Unable to update your password.' };
    }
  },
};


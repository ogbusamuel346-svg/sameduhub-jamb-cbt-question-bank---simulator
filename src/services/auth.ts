import { User } from '../types/index.ts';

export interface AuthApiResponse {
  success: boolean;
  user?: User;
  message?: string;
  error?: string;
}

interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  user: SupabaseUser;
}

type AuthEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'PASSWORD_RECOVERY' | 'TOKEN_REFRESHED' | 'USER_UPDATED';
type AuthListener = (event: AuthEvent, session: SupabaseSession | null) => void;

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const sessionStorageKey = 'sameduhub_supabase_session_v1';
const listeners = new Set<AuthListener>();

let currentSession: SupabaseSession | null = null;
let initialization: Promise<void> | null = null;

function configurationError() {
  return new Error('Supabase Auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
}

function ensureConfigured() {
  if (!supabaseUrl || !supabaseKey) throw configurationError();
}

function normalizeSession(session: SupabaseSession): SupabaseSession {
  return {
    ...session,
    expires_at: session.expires_at || Math.floor(Date.now() / 1000) + session.expires_in,
  };
}

function loadStoredSession() {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(sessionStorageKey);
    return stored ? normalizeSession(JSON.parse(stored) as SupabaseSession) : null;
  } catch {
    return null;
  }
}

function persistSession(session: SupabaseSession | null) {
  currentSession = session ? normalizeSession(session) : null;
  if (typeof window === 'undefined') return;

  if (currentSession) window.localStorage.setItem(sessionStorageKey, JSON.stringify(currentSession));
  else window.localStorage.removeItem(sessionStorageKey);
}

function notify(event: AuthEvent, session: SupabaseSession | null) {
  listeners.forEach(listener => listener(event, session));
}

async function authRequest<T>(path: string, init: RequestInit = {}, accessToken?: string): Promise<T> {
  ensureConfigured();
  const response = await fetch(`${supabaseUrl}/auth/v1/${path.replace(/^\//, '')}`, {
    ...init,
    headers: {
      apikey: supabaseKey,
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error_description || data.msg || data.message || data.error || `Supabase Auth request failed (${response.status}).`);
  }
  return data as T;
}

async function fetchSupabaseUser(accessToken: string) {
  return authRequest<SupabaseUser>('user', {}, accessToken);
}

async function initializeSupabaseAuth() {
  if (initialization) return initialization;

  initialization = (async () => {
    currentSession = loadStoredSession();
    if (typeof window === 'undefined') return;

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = hash.get('access_token');
    const refreshToken = hash.get('refresh_token');
    if (!accessToken || !refreshToken) return;

    try {
      const user = await fetchSupabaseUser(accessToken);
      const session = normalizeSession({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: Number(hash.get('expires_in') || 3600),
        expires_at: Number(hash.get('expires_at') || 0) || undefined,
        user,
      });
      persistSession(session);
      window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
      notify(hash.get('type') === 'recovery' ? 'PASSWORD_RECOVERY' : 'SIGNED_IN', session);
    } catch {
      persistSession(null);
    }
  })();

  return initialization;
}

async function refreshSession(session: SupabaseSession) {
  const refreshed = await authRequest<SupabaseSession>('token?grant_type=refresh_token', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  const normalized = normalizeSession(refreshed);
  persistSession(normalized);
  notify('TOKEN_REFRESHED', normalized);
  return normalized;
}

async function getSession() {
  await initializeSupabaseAuth();
  if (!currentSession) return null;

  const expiresAt = currentSession.expires_at || 0;
  if (expiresAt && expiresAt <= Math.floor(Date.now() / 1000) + 60) {
    try {
      return await refreshSession(currentSession);
    } catch {
      persistSession(null);
      notify('SIGNED_OUT', null);
      return null;
    }
  }

  return currentSession;
}

async function setAuthenticatedSession(session: SupabaseSession, event: AuthEvent | null = 'SIGNED_IN') {
  const normalized = normalizeSession(session);
  const user = await fetchSupabaseUser(normalized.access_token);
  const withUser = { ...normalized, user };
  persistSession(withUser);
  if (event) notify(event, withUser);
  return withUser;
}

export async function getSupabaseAccessToken() {
  const session = await getSession();
  return session?.access_token || '';
}

export function onSupabaseAuthStateChange(listener: AuthListener) {
  listeners.add(listener);
  void initializeSupabaseAuth();
  return () => listeners.delete(listener);
}

async function readApiResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string; message?: string };
  if (!response.ok) {
    throw new Error(data.error || data.message || `Authentication request failed (${response.status}).`);
  }
  return data;
}

async function apiRequest<T>(url: string, init: RequestInit = {}, accessToken?: string): Promise<T> {
  const token = accessToken || await getSupabaseAccessToken();
  const response = await fetch(url, {
    ...init,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  return readApiResponse<T>(response);
}

async function loadProfile(accessToken: string) {
  return apiRequest<AuthApiResponse>('/api/auth/profile', {}, accessToken);
}

async function saveProfile(data: {
  name: string;
  email: string;
  jambRegNumber?: string;
  targetScore?: number;
  selectedSubjects?: string[];
}, accessToken: string) {
  return apiRequest<AuthApiResponse>('/api/auth/profile', {
    method: 'POST',
    body: JSON.stringify(data),
  }, accessToken);
}

export const AuthService = {
  async getSession(): Promise<AuthApiResponse> {
    try {
      const session = await getSession();
      if (!session) return { success: false, error: 'No active Supabase session.' };
      return await loadProfile(session.access_token);
    } catch (error: any) {
      return { success: false, error: error?.message || 'Unable to restore your Supabase session.' };
    }
  },

  async signIn(email: string, password: string): Promise<AuthApiResponse> {
    try {
      const session = await setAuthenticatedSession(await authRequest<SupabaseSession>('token?grant_type=password', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }), null);
      const profile = await loadProfile(session.access_token);
      notify('SIGNED_IN', session);
      return profile;
    } catch (error: any) {
      return { success: false, error: error?.message || 'Unable to sign you in with Supabase.' };
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
      const result = await authRequest<{ user: SupabaseUser; session: SupabaseSession | null }>('signup', {
        method: 'POST',
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          data: {
            name: data.name,
            full_name: data.name,
            jamb_reg_number: data.jambRegNumber || '',
            target_score: data.targetScore || 320,
            selected_subjects: data.selectedSubjects || [],
          },
        }),
      });

      if (!result.session) {
        return {
          success: true,
          message: 'Account created. Check your email to confirm your Supabase account, then sign in.',
        };
      }

      const session = await setAuthenticatedSession(result.session);
      return await saveProfile(data, session.access_token);
    } catch (error: any) {
      return { success: false, error: error?.message || 'Unable to create your Supabase account.' };
    }
  },

  async signOut(): Promise<AuthApiResponse> {
    try {
      const session = await getSession();
      if (session) await authRequest('logout?scope=local', { method: 'POST' }, session.access_token).catch(() => undefined);
      persistSession(null);
      notify('SIGNED_OUT', null);
      return { success: true, message: 'Signed out successfully.' };
    } catch (error: any) {
      persistSession(null);
      notify('SIGNED_OUT', null);
      return { success: false, error: error?.message || 'Unable to sign out.' };
    }
  },

  async requestPasswordReset(email: string): Promise<AuthApiResponse> {
    try {
      const redirectTo = typeof window === 'undefined'
        ? undefined
        : `${window.location.origin}/?auth=recovery`;
      await authRequest('recover', {
        method: 'POST',
        body: JSON.stringify({ email, ...(redirectTo ? { redirect_to: redirectTo } : {}) }),
      });
      return { success: true, message: 'If an account exists for that email, Supabase has sent a reset link.' };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Unable to request a Supabase password reset.' };
    }
  },

  async confirmPasswordReset(_token: string, newPassword: string): Promise<AuthApiResponse> {
    try {
      const session = await getSession();
      if (!session) return { success: false, error: 'This Supabase password reset link is invalid or has expired.' };
      await authRequest('user', {
        method: 'PUT',
        body: JSON.stringify({ password: newPassword }),
      }, session.access_token);
      notify('USER_UPDATED', session);
      return { success: true, message: 'Password updated. You can now sign in.' };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Unable to update your Supabase password.' };
    }
  },
};

import { createAuthClient } from '@neondatabase/auth';
import { BetterAuthReactAdapter } from '@neondatabase/auth/react/adapters';

const neonAuthUrl = import.meta.env.VITE_NEON_AUTH_URL as string | undefined;

/**
 * Managed Neon Auth client. The URL is intentionally public: it identifies the
 * branch Auth service, while passwords and sessions stay inside Neon Auth.
 */
export const neonAuthClient = neonAuthUrl
  ? createAuthClient(neonAuthUrl, {
      adapter: BetterAuthReactAdapter(),
    })
  : null;

export const getNeonAuthError = (error: unknown, fallback: string): string => {
  if (typeof error === 'string' && error.trim()) return error;

  if (error && typeof error === 'object') {
    const candidate = error as { message?: unknown; statusText?: unknown };
    if (typeof candidate.message === 'string' && candidate.message.trim()) {
      return candidate.message;
    }
    if (typeof candidate.statusText === 'string' && candidate.statusText.trim()) {
      return candidate.statusText;
    }
  }

  return fallback;
};

export const getNeonAuthToken = async (): Promise<string | null> => {
  if (!neonAuthClient) return null;

  try {
    const result = await neonAuthClient.token();
    return result.error || !result.data?.token ? null : result.data.token;
  } catch (error) {
    console.warn('Unable to retrieve Neon Auth token:', error);
    return null;
  }
};

export const requireNeonAuthClient = () => {
  if (!neonAuthClient) {
    throw new Error(
      'Neon Auth is not configured. Set VITE_NEON_AUTH_URL to the Auth URL for the linked Neon branch.',
    );
  }

  return neonAuthClient;
};

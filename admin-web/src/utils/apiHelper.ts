/**
 * Unified API Helper for AHTRI FFA Admin Web
 * Automatically detects whether local development server (http://localhost:3000)
 * is available or falls back to the live Render cloud backend (https://ahtri-backend.onrender.com).
 */

export const RENDER_BACKEND_URL = 'https://ahtri-backend.onrender.com';

export function getApiBaseUrl(): string {
  // 1. Custom backend URL configured in Settings
  const saved = localStorage.getItem('ahtri_backend_url');
  if (saved && saved.trim()) {
    return saved.trim().replace(/\/+$/, '');
  }

  // 2. Vite environment variable if provided and not default localhost:3000
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl && !envUrl.includes('localhost:3000') && !envUrl.includes('127.0.0.1:3000')) {
    return envUrl.replace(/\/+$/, '');
  }

  // 3. Fallback to production Render backend
  return RENDER_BACKEND_URL;
}

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Resilient fetch that tries primary server, and immediately falls back
 * to live Render server if local/primary is unreachable.
 */
export async function resilientFetch(
  endpoint: string,
  init?: RequestInit,
  timeoutMs = 12000
): Promise<Response> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const primaryBase = getApiBaseUrl();

  // Try primary
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${primaryBase}${cleanEndpoint}`, {
      ...init,
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res;
  } catch (primaryErr) {
    // If primary was not Render and failed, retry with Render
    if (primaryBase !== RENDER_BACKEND_URL) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const fallbackRes = await fetch(`${RENDER_BACKEND_URL}${cleanEndpoint}`, {
          ...init,
          signal: controller.signal,
        });
        clearTimeout(timer);
        return fallbackRes;
      } catch (fallbackErr) {
        throw fallbackErr;
      }
    }
    throw primaryErr;
  }
}

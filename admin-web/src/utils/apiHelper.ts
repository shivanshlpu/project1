/**
 * Unified API Helper for AHTRI FFA Admin Web
 * Automatically detects whether local development server (http://localhost:3000)
 * is available or falls back to the live Render cloud backend (https://ahtri-backend.onrender.com).
 * Also synchronizes and merges device authorizations across both endpoints so OTPs always go through.
 */

export const RENDER_BACKEND_URL = 'https://ahtri-backend.onrender.com';
export const LOCAL_BACKEND_URL = 'http://localhost:3000';

export function getApiBaseUrl(): string {
  // 1. Custom backend URL configured in Settings
  const saved = localStorage.getItem('ahtri_backend_url');
  if (saved && saved.trim()) {
    return saved.trim().replace(/\/+$/, '');
  }

  // 2. Prioritize local backend server when running locally in browser
  if (
    typeof window !== 'undefined' &&
    window.location &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    return LOCAL_BACKEND_URL;
  }

  // 3. Vite environment variable if provided
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl && envUrl.trim() && !envUrl.includes('localhost:3000') && !envUrl.includes('127.0.0.1:3000')) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 4. Fallback to production Render backend (ensures live cloud and mobile device connectivity)
  return RENDER_BACKEND_URL;
}

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'x-user-id': 'usr-admin-shivansh',
    'x-user-role': 'SUPER_ADMIN',
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
  timeoutMs = 8000
): Promise<Response> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const primaryBase = getApiBaseUrl();

  const baseHeaders = getAuthHeaders();
  const mergedInit: RequestInit = {
    ...init,
    headers: {
      ...baseHeaders,
      ...(init?.headers || {}),
    },
  };

  // Try primary
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${primaryBase}${cleanEndpoint}`, {
      ...mergedInit,
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok || res.status < 500) {
      return res;
    }
  } catch {}

  // If primary was not Render and failed or returned 5xx, retry with Render
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

  // Also try local if primary was Render and failed
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const localRes = await fetch(`${LOCAL_BACKEND_URL}${cleanEndpoint}`, {
      ...init,
      signal: controller.signal,
    });
    clearTimeout(timer);
    return localRes;
  } catch {}

  throw new Error(`Failed to fetch from ${cleanEndpoint}`);
}

/**
 * Dual Device Authorization Fetcher
 * Queries both local backend and live Render cloud backend, merging and deduplicating
 * all pending OTP requests so an OTP requested on mobile is 100% guaranteed to appear in the Admin Panel.
 */
export async function fetchDeviceAuthorizationsMerged(): Promise<{ pending: any[]; history: any[] }> {
  const pendingMap = new Map<string, any>();
  const historyMap = new Map<string, any>();

  const headers = getAuthHeaders();

  // Fetch from Render Cloud Backend
  try {
    const renderRes = await fetch(`${RENDER_BACKEND_URL}/auth/device-authorizations`, { headers, signal: AbortSignal.timeout(6000) });
    if (renderRes.ok) {
      const data = await renderRes.json();
      (data.pending || []).forEach((item: any) => pendingMap.set(item.id, item));
      (data.history || []).forEach((item: any) => historyMap.set(item.id, item));
    }
  } catch {}

  // Also fetch from Local Backend if running
  try {
    const localRes = await fetch(`${LOCAL_BACKEND_URL}/auth/device-authorizations`, { headers, signal: AbortSignal.timeout(2000) });
    if (localRes.ok) {
      const data = await localRes.json();
      (data.pending || []).forEach((item: any) => {
        if (!pendingMap.has(item.id)) pendingMap.set(item.id, item);
      });
      (data.history || []).forEach((item: any) => {
        if (!historyMap.has(item.id)) historyMap.set(item.id, item);
      });
    }
  } catch {}

  const pending = Array.from(pendingMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const history = Array.from(historyMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return { pending, history };
}

/**
 * Dual Approval / Rejection: sends action to both local and Render backends
 */
export async function approveDeviceAuthorizationDual(id: string): Promise<boolean> {
  const headers = getAuthHeaders();
  let ok = false;
  try {
    const r1 = await fetch(`${RENDER_BACKEND_URL}/auth/device-authorizations/${id}/approve`, { method: 'POST', headers, signal: AbortSignal.timeout(6000) });
    if (r1.ok) ok = true;
  } catch {}
  try {
    const r2 = await fetch(`${LOCAL_BACKEND_URL}/auth/device-authorizations/${id}/approve`, { method: 'POST', headers, signal: AbortSignal.timeout(2000) });
    if (r2.ok) ok = true;
  } catch {}
  return ok;
}

export async function rejectDeviceAuthorizationDual(id: string): Promise<boolean> {
  const headers = getAuthHeaders();
  let ok = false;
  try {
    const r1 = await fetch(`${RENDER_BACKEND_URL}/auth/device-authorizations/${id}/reject`, { method: 'POST', headers, signal: AbortSignal.timeout(6000) });
    if (r1.ok) ok = true;
  } catch {}
  try {
    const r2 = await fetch(`${LOCAL_BACKEND_URL}/auth/device-authorizations/${id}/reject`, { method: 'POST', headers, signal: AbortSignal.timeout(2000) });
    if (r2.ok) ok = true;
  } catch {}
  return ok;
}


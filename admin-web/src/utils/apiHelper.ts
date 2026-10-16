

export const RENDER_BACKEND_URL = 'https://ahtri-backend.onrender.com';
export const LOCAL_BACKEND_URL = 'http://localhost:3000';

export function getApiBaseUrl(): string {
  
  const saved = localStorage.getItem('ahtri_backend_url');
  if (saved && saved.trim()) {
    return saved.trim().replace(/\/+$/, '');
  }

  
  if (
    typeof window !== 'undefined' &&
    window.location &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    return LOCAL_BACKEND_URL;
  }

  
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl && envUrl.trim() && !envUrl.includes('localhost:3000') && !envUrl.includes('127.0.0.1:3000')) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  
  return RENDER_BACKEND_URL;
}

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('ahtri_auth_token') || localStorage.getItem('token');
  let user: any = {};
  try {
    user = JSON.parse(localStorage.getItem('ahtri_user') || '{}');
  } catch {}

  const userId = user?.id || 'usr-admin-01';
  const userRole = user?.role || 'SUPER_ADMIN';

  return {
    'Content-Type': 'application/json',
    'x-user-id': userId,
    'x-user-role': userRole,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function tryRefreshToken(baseUrl: string): Promise<string | null> {
  try {
    const refreshToken = localStorage.getItem('ahtri_refresh_token');
    if (!refreshToken) return null;
    const r = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (r.ok) {
      const d = await r.json();
      if (d?.access_token) {
        localStorage.setItem('ahtri_auth_token', d.access_token);
        localStorage.setItem('token', d.access_token);
        if (d?.refresh_token) {
          localStorage.setItem('ahtri_refresh_token', d.refresh_token);
        }
        return d.access_token;
      }
    }
  } catch {}
  return null;
}

export async function resilientFetch(
  endpoint: string,
  init?: RequestInit,
  timeoutMs = 8000
): Promise<Response> {
  
  let cleanEndpoint = endpoint;
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    try {
      const parsed = new URL(endpoint);
      cleanEndpoint = parsed.pathname + parsed.search;
    } catch {
      cleanEndpoint = endpoint.replace(/^https?:\/\/[^/]+/, '');
    }
  }
  if (!cleanEndpoint.startsWith('/')) {
    cleanEndpoint = `/${cleanEndpoint}`;
  }

  const primaryBase = getApiBaseUrl();
  const baseHeaders = getAuthHeaders();
  const mergedInit: RequestInit = {
    ...init,
    headers: {
      ...baseHeaders,
      ...(init?.headers || {}),
    },
  };

  
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res = await fetch(`${primaryBase}${cleanEndpoint}`, {
      ...mergedInit,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.status === 401) {
      const newToken = await tryRefreshToken(primaryBase);
      if (newToken) {
        res = await fetch(`${primaryBase}${cleanEndpoint}`, {
          ...mergedInit,
          headers: {
            ...mergedInit.headers,
            Authorization: `Bearer ${newToken}`,
          },
        });
      }
    }

    if (res.ok || (res.status < 500 && res.status !== 401)) {
      return res;
    }
  } catch {}

  
  if (primaryBase !== RENDER_BACKEND_URL) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let fallbackRes = await fetch(`${RENDER_BACKEND_URL}${cleanEndpoint}`, {
        ...mergedInit,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (fallbackRes.status === 401) {
        const newToken = await tryRefreshToken(RENDER_BACKEND_URL);
        if (newToken) {
          fallbackRes = await fetch(`${RENDER_BACKEND_URL}${cleanEndpoint}`, {
            ...mergedInit,
            headers: {
              ...mergedInit.headers,
              Authorization: `Bearer ${newToken}`,
            },
          });
        }
      }

      return fallbackRes;
    } catch (fallbackErr) {
      throw fallbackErr;
    }
  }

  
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const localRes = await fetch(`${LOCAL_BACKEND_URL}${cleanEndpoint}`, {
      ...mergedInit,
      signal: controller.signal,
    });
    clearTimeout(timer);
    return localRes;
  } catch {}

  throw new Error(`Failed to fetch from ${cleanEndpoint}`);
}

export async function fetchDeviceAuthorizationsMerged(): Promise<{ pending: any[]; history: any[] }> {
  const pendingMap = new Map<string, any>();
  const historyMap = new Map<string, any>();

  const headers = getAuthHeaders();

  
  try {
    const renderRes = await fetch(`${RENDER_BACKEND_URL}/auth/device-authorizations`, { headers, signal: AbortSignal.timeout(6000) });
    if (renderRes.ok) {
      const data = await renderRes.json();
      (data.pending || []).forEach((item: any) => pendingMap.set(item.id, item));
      (data.history || []).forEach((item: any) => historyMap.set(item.id, item));
    }
  } catch {}

  
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


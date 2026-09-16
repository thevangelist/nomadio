import type { DashboardState } from '@nomadio/shared';

type RuntimeConfig = { apiBase?: string };

let apiBase = import.meta.env.VITE_API_BASE ?? '';

const TOKEN_KEY = 'nomadio.token';

const readStoredToken = (): string => {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
};

let token = readStoredToken();

/**
 * The token can arrive in the link you send yourself, so opening the dashboard on a new phone is
 * one tap. It is stored and stripped from the address bar immediately, because a URL with a
 * credential in it ends up in history, screenshots and shoulder-surfing range.
 */
export function adoptTokenFromUrl(): void {
  const url = new URL(location.href);
  const fromUrl = url.searchParams.get('token');
  if (!fromUrl) return;
  setToken(fromUrl);
  url.searchParams.delete('token');
  history.replaceState(null, '', url.toString());
}

export function setToken(value: string): void {
  token = value.trim();
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // private mode: the token lives for this tab only
  }
}

export const hasToken = () => token.length > 0;

export const authHeaders = (): HeadersInit => (token ? { authorization: `Bearer ${token}` } : {});

export class Unauthorized extends Error {
  constructor() {
    super('unauthorized');
  }
}

/**
 * Deploy-time config, not build-time: the same static bundle is dropped on Vercel, Cloudflare
 * Pages, Netlify, nginx or a Raspberry Pi, and only public/config.json changes. An empty
 * apiBase means the API is same-origin, which is what the Docker image does.
 */
export async function loadRuntimeConfig(): Promise<void> {
  try {
    const res = await fetch('/config.json', { cache: 'no-store' });
    if (!res.ok) return;
    const cfg = (await res.json()) as RuntimeConfig;
    if (typeof cfg.apiBase === 'string') apiBase = cfg.apiBase;
  } catch {
    // keep the build-time default
  }
}

export const base = () => apiBase.replace(/\/$/, '');

export const wsUrl = () => {
  const b = base();
  const origin = b ? b.replace(/^http/, 'ws') : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`;
  // A WebSocket handshake cannot carry headers, so the token rides in the query string.
  return `${origin}/api/realtime${token ? `?token=${encodeURIComponent(token)}` : ''}`;
};

export const api = (path: string) => `${base()}${path}`;

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(api(path), {
    ...init,
    cache: 'no-store',
    headers: { ...authHeaders(), ...(init.headers ?? {}) },
  });
  if (res.status === 401) throw new Unauthorized();
  return res;
}

export async function fetchState(signal?: AbortSignal): Promise<DashboardState> {
  const res = await apiFetch('/api/v1/status', { signal });
  if (!res.ok) throw new Error(`status ${res.status}`);
  return res.json();
}

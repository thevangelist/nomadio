import type { DashboardState } from '@nomadio/shared';

type RuntimeConfig = { apiBase?: string };

let apiBase = import.meta.env.VITE_API_BASE ?? '';

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
  if (b) return `${b.replace(/^http/, 'ws')}/api/realtime`;
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/realtime`;
};

export const api = (path: string) => `${base()}${path}`;

export async function fetchState(signal?: AbortSignal): Promise<DashboardState> {
  const res = await fetch(api('/api/v1/status'), { signal, cache: 'no-store' });
  if (!res.ok) throw new Error(`status ${res.status}`);
  return res.json();
}

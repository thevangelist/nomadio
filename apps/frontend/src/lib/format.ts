export const DASH = '—';

export const fmt = (v: number | null | undefined, unit: string, digits = 0): string =>
  typeof v === 'number' && Number.isFinite(v) ? `${v.toFixed(digits)} ${unit}` : DASH;

export const mbps = (kbps: number | null | undefined): string =>
  typeof kbps === 'number' ? `${(kbps / 1000).toFixed(2)} Mbps` : DASH;

export const duration = (ms: number | null | undefined): string => {
  if (typeof ms !== 'number' || ms < 0) return DASH;
  const s = Math.floor(ms / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};

export const bytes = (b: number | null | undefined): string => {
  if (typeof b !== 'number') return DASH;
  const gb = b / 1024 ** 3;
  return gb >= 1 ? `${gb.toFixed(2)} GB` : `${(b / 1024 ** 2).toFixed(0)} MB`;
};

export const clock = (ts: number | null | undefined): string =>
  typeof ts === 'number' ? new Date(ts).toLocaleTimeString() : DASH;

import { z } from 'zod';

const Env = z.object({
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.string().default('info'),
  CORS_ORIGIN: z.string().default('*'),
  POLL_INTERVAL_MS: z.coerce.number().min(250).default(1000),
  STREAM_PROVIDER: z.enum(['mock', 'mediamtx', 'srt', 'nginx-rtmp']).default('mock'),
  NETWORK_PROVIDER: z.enum(['single', 'none']).default('single'),
  MEDIAMTX_API_URL: z.string().url().optional(),
  SRT_STATS_URL: z.string().url().optional(),
  NGINX_RTMP_STATS_URL: z.string().url().optional(),
  STREAM_APP: z.string().default('live'),
  STREAM_KEY: z.string().optional(),
  API_TOKEN: z.string().min(16).optional(),
  TELEMETRY_TOKEN: z.string().optional(),
  DEVICE_STALE_MS: z.coerce.number().default(120_000),
});

export type Config = z.infer<typeof Env>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const cfg = Env.parse(env);
  if (cfg.STREAM_PROVIDER === 'mediamtx' && !cfg.MEDIAMTX_API_URL) {
    throw new Error('STREAM_PROVIDER=mediamtx requires MEDIAMTX_API_URL');
  }
  if (cfg.STREAM_PROVIDER === 'srt' && !cfg.SRT_STATS_URL) {
    throw new Error('STREAM_PROVIDER=srt requires SRT_STATS_URL');
  }
  if (cfg.STREAM_PROVIDER === 'nginx-rtmp' && !cfg.NGINX_RTMP_STATS_URL) {
    throw new Error('STREAM_PROVIDER=nginx-rtmp requires NGINX_RTMP_STATS_URL');
  }
  return cfg;
}

/** Warn loudly rather than fail: an unauthenticated LAN install is a legitimate choice. */
export function authWarning(cfg: Config): string | null {
  return cfg.API_TOKEN ? null : 'API_TOKEN is not set — the API is open to anyone who can reach it';
}

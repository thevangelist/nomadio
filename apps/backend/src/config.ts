import { z } from 'zod';

const Env = z.object({
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.string().default('info'),
  CORS_ORIGIN: z.string().default('*'),
  POLL_INTERVAL_MS: z.coerce.number().min(250).default(1000),
  STREAM_PROVIDER: z.enum(['mock', 'srt', 'nginx-rtmp']).default('mock'),
  NETWORK_PROVIDER: z.enum(['single', 'none']).default('single'),
  SRT_STATS_URL: z.string().url().optional(),
  NGINX_RTMP_STATS_URL: z.string().url().optional(),
  STREAM_APP: z.string().default('live'),
  STREAM_KEY: z.string().optional(),
  TELEMETRY_TOKEN: z.string().optional(),
  DEVICE_STALE_MS: z.coerce.number().default(120_000),
});

export type Config = z.infer<typeof Env>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const cfg = Env.parse(env);
  if (cfg.STREAM_PROVIDER === 'srt' && !cfg.SRT_STATS_URL) {
    throw new Error('STREAM_PROVIDER=srt requires SRT_STATS_URL');
  }
  if (cfg.STREAM_PROVIDER === 'nginx-rtmp' && !cfg.NGINX_RTMP_STATS_URL) {
    throw new Error('STREAM_PROVIDER=nginx-rtmp requires NGINX_RTMP_STATS_URL');
  }
  return cfg;
}

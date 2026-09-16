import pino from 'pino';
import type { Config } from './config.js';

export const createLogger = (cfg: Pick<Config, 'LOG_LEVEL'>) =>
  pino({ level: cfg.LOG_LEVEL, base: { service: 'nomadio-backend' } });

export type Logger = ReturnType<typeof createLogger>;

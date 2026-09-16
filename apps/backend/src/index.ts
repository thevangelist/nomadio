import { loadConfig } from './config.js';
import { buildApp } from './server.js';

const cfg = loadConfig();
const { fastify, collector, logger } = await buildApp(cfg);

collector.start();

const shutdown = async (signal: string) => {
  logger.info({ signal }, 'shutting down');
  collector.stop();
  await fastify.close();
  process.exit(0);
};
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

fastify.listen({ port: cfg.PORT, host: cfg.HOST }).catch((err) => {
  logger.error({ err }, 'failed to listen');
  process.exit(1);
});

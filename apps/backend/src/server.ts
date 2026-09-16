import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import Fastify from 'fastify';
import { DeviceTelemetry } from '@nomadio/shared';
import type { Config } from './config.js';
import { createLogger } from './logger.js';
import { createNetworkProvider, createStreamProvider } from './providers/index.js';
import { Collector } from './core/collector.js';
import { DeviceRegistry } from './core/devices.js';
import { Hub } from './core/hub.js';
import { SettingsStore } from './core/settings.js';
import { MarkerLog } from './core/markers.js';

export type App = Awaited<ReturnType<typeof buildApp>>;

export async function buildApp(cfg: Config) {
  const logger = createLogger(cfg);
  const hub = new Hub();
  const devices = new DeviceRegistry(cfg.DEVICE_STALE_MS);
  const settings = new SettingsStore();
  const markers = new MarkerLog();
  const stream = createStreamProvider(cfg);

  let collector: Collector;
  const network = createNetworkProvider(cfg, () => collector.latestStream());
  collector = new Collector({
    stream,
    network,
    devices,
    hub,
    markers,
    logger,
    intervalMs: cfg.POLL_INTERVAL_MS,
    settings: () => settings.get(),
  });

  const fastify = Fastify({ loggerInstance: logger });
  // Awaited: routes registered before the plugin is ready silently fall back to
  // plain HTTP handlers, and the websocket route then gets a Request, not a socket.
  await fastify.register(cors, { origin: cfg.CORS_ORIGIN === '*' ? true : cfg.CORS_ORIGIN.split(',') });
  await fastify.register(websocket);

  const authOk = (header: string | undefined) =>
    !cfg.TELEMETRY_TOKEN || header === `Bearer ${cfg.TELEMETRY_TOKEN}`;

  fastify.get('/healthz', async () => ({ ok: true, uptimeSec: Math.round(process.uptime()) }));
  fastify.get('/readyz', async (_req, reply) => {
    const state = hub.latest();
    if (!state) return reply.code(503).send({ ok: false, reason: 'no snapshot yet' });
    return { ok: true, streamSource: state.stream.source, clients: hub.size };
  });

  fastify.get('/api/v1/status', async () => hub.latest() ?? (await collector.tick()));
  fastify.get('/api/v1/stream', async () => (hub.latest() ?? (await collector.tick())).stream);
  fastify.get('/api/v1/network', async () => (hub.latest() ?? (await collector.tick())).network);
  fastify.get('/api/v1/devices', async () => devices.list());
  fastify.get('/api/v1/session', async () => (hub.latest() ?? (await collector.tick())).session);
  fastify.get('/api/v1/settings', async () => settings.get());
  fastify.get('/api/v1/markers', async () => markers.list());

  fastify.post('/api/v1/markers', async (req, reply) => {
    const note = String((req.body as { note?: unknown } | undefined)?.note ?? '').trim();
    if (!note) return reply.code(400).send({ error: 'note is required' });
    const state = hub.latest() ?? (await collector.tick());
    return markers.add(note, state.stream.state, collector.sessionStartedAt());
  });

  fastify.patch('/api/v1/settings', async (req, reply) => {
    try {
      return settings.update(req.body);
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });

  fastify.post('/api/v1/telemetry', async (req, reply) => {
    if (!authOk(req.headers.authorization)) return reply.code(401).send({ error: 'unauthorized' });
    const parsed = DeviceTelemetry.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    return { accepted: true, device: devices.ingest(parsed.data) };
  });

  // V3 seam. Declared so the client contract exists before the implementation does.
  fastify.post('/api/v1/overlay/scene', async (_req, reply) =>
    reply.code(501).send({ error: 'OverlayProvider not configured. See docs/04-roadmap.md (V3).' }),
  );

  fastify.get('/api/realtime', { websocket: true }, (socket) => {
    hub.add(socket);
    socket.on('close', () => hub.remove(socket));
    socket.on('error', () => hub.remove(socket));
  });

  return { fastify, collector, logger };
}

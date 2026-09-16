import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';
import { buildApp, type App } from '../src/server.js';

let app: App;

beforeAll(async () => {
  app = await buildApp(loadConfig({ STREAM_PROVIDER: 'mock', LOG_LEVEL: 'silent', TELEMETRY_TOKEN: 'secret' } as never));
  await app.fastify.ready();
  await app.collector.tick();
});
afterAll(async () => app.fastify.close());

const inject = (opts: Parameters<App['fastify']['inject']>[0]) => app.fastify.inject(opts);

describe('API', () => {
  it('reports health', async () => {
    expect((await inject({ method: 'GET', url: '/healthz' })).statusCode).toBe(200);
  });

  it('returns a full dashboard state', async () => {
    const res = await inject({ method: 'GET', url: '/api/v1/status' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty('stream.state');
    expect(body).toHaveProperty('session.outages');
  });

  it('rejects telemetry without the token', async () => {
    const res = await inject({ method: 'POST', url: '/api/v1/telemetry', payload: { deviceId: 'iphone' } });
    expect(res.statusCode).toBe(401);
  });

  it('accepts valid telemetry and lists the device', async () => {
    const headers = { authorization: 'Bearer secret' };
    const res = await inject({
      method: 'POST',
      url: '/api/v1/telemetry',
      headers,
      payload: { deviceId: 'iphone', label: 'iPhone 16', batteryPct: 61, charging: false },
    });
    expect(res.statusCode).toBe(200);
    expect((await inject({ method: 'GET', url: '/api/v1/devices' })).json()[0].batteryPct).toBe(61);
  });

  it('rejects out-of-range telemetry', async () => {
    const res = await inject({
      method: 'POST',
      url: '/api/v1/telemetry',
      headers: { authorization: 'Bearer secret' },
      payload: { deviceId: 'iphone', batteryPct: 900 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('defaults location privacy to off and refuses the unimplemented quality ladder', async () => {
    expect((await inject({ method: 'GET', url: '/api/v1/settings' })).json().privacy.exposeLocation).toBe('off');
    const res = await inject({
      method: 'PATCH',
      url: '/api/v1/settings',
      payload: { autoQualityLadder: { enabled: true } },
    });
    expect(res.statusCode).toBe(400);
  });

  it('answers 501 on the overlay seam', async () => {
    expect((await inject({ method: 'POST', url: '/api/v1/overlay/scene', payload: { id: 'x' } })).statusCode).toBe(501);
  });
});

describe('realtime', () => {
  it('accepts a websocket client and pushes a state frame', async () => {
    await app.fastify.listen({ port: 0, host: '127.0.0.1' });
    const address = app.fastify.server.address();
    const port = typeof address === 'object' && address ? address.port : 0;
    const { WebSocket } = await import('ws');
    const socket = new WebSocket(`ws://127.0.0.1:${port}/api/realtime`);

    const frame = await new Promise<{ type: string }>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('no frame in 4s')), 4000);
      socket.on('message', (data) => {
        clearTimeout(timer);
        resolve(JSON.parse(String(data)) as { type: string });
      });
      socket.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
    socket.close();

    expect(frame.type).toBe('state');
  });
});

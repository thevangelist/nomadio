import { afterEach, describe, expect, it, vi } from 'vitest';
import { MediaMtxStreamProvider } from '../src/providers/stream/mediamtx.js';

const respond = (routes: Record<string, unknown>) =>
  vi.stubGlobal('fetch', async (url: string) => {
    const hit = Object.entries(routes).find(([path]) => String(url).includes(path));
    if (!hit) return { ok: false, json: async () => ({}) };
    return { ok: true, json: async () => hit[1] };
  });

afterEach(() => vi.unstubAllGlobals());

describe('MediaMtxStreamProvider', () => {
  it('reports OFFLINE when no publisher is connected', async () => {
    respond({ '/v3/paths/get/live': { name: 'live', ready: false, bytesReceived: 0 } });
    const snap = await new MediaMtxStreamProvider('http://ingest:9997', 'live').poll();
    expect(snap.state).toBe('OFFLINE');
  });

  it('reports UNKNOWN when the API cannot be reached', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('ECONNREFUSED');
    });
    const snap = await new MediaMtxStreamProvider('http://ingest:9997', 'live').poll();
    expect(snap.state).toBe('UNKNOWN');
  });

  it('prefers SRT connection stats for bitrate, RTT and loss', async () => {
    respond({
      '/v3/paths/get/live': { ready: true, bytesReceived: 1000, readyTime: '2026-09-16T10:00:00Z' },
      '/v3/srtconns/list': {
        items: [{ path: 'live', mbpsReceiveRate: 5.4, msRTT: 42, packetsReceivedLoss: 5, packetsReceived: 995 }],
      },
    });
    const snap = await new MediaMtxStreamProvider('http://ingest:9997', 'live').poll();
    expect(snap).toMatchObject({ state: 'LIVE', bitrateKbps: 5400, latencyMs: 42, packetLossPct: 0.5 });
    expect(snap.publisherSince).toBe(Date.parse('2026-09-16T10:00:00Z'));
  });

  it('leaves loss and latency unknown for an RTMP publisher and derives bitrate from bytes', async () => {
    const provider = new MediaMtxStreamProvider('http://ingest:9997', 'live');
    respond({ '/v3/paths/get/live': { ready: true, bytesReceived: 0 }, '/v3/srtconns/list': { items: [] } });
    await provider.poll();

    vi.useFakeTimers();
    vi.advanceTimersByTime(1000);
    respond({ '/v3/paths/get/live': { ready: true, bytesReceived: 125_000 }, '/v3/srtconns/list': { items: [] } });
    const snap = await provider.poll();
    vi.useRealTimers();

    expect(snap.bitrateKbps).toBe(1000);
    expect(snap.latencyMs).toBeNull();
    expect(snap.packetLossPct).toBeNull();
    expect(snap.fps).toBeNull();
  });
});

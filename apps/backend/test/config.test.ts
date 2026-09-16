import { describe, expect, it } from 'vitest';
import { authWarning, loadConfig } from '../src/config.js';
import { SingleLinkNetworkProvider, NoNetworkProvider } from '../src/providers/network/single.js';
import type { StreamSnapshot } from '@nomadio/shared';

const env = (o: Record<string, string>) => o as never;

describe('config', () => {
  it('defaults to the mock provider so a fresh clone runs', () => {
    const cfg = loadConfig(env({}));
    expect(cfg.STREAM_PROVIDER).toBe('mock');
    expect(cfg.PORT).toBe(4000);
  });

  it('refuses a provider that has no endpoint configured', () => {
    expect(() => loadConfig(env({ STREAM_PROVIDER: 'mediamtx' }))).toThrow(/MEDIAMTX_API_URL/);
    expect(() => loadConfig(env({ STREAM_PROVIDER: 'srt' }))).toThrow(/SRT_STATS_URL/);
    expect(() => loadConfig(env({ STREAM_PROVIDER: 'nginx-rtmp' }))).toThrow(/NGINX_RTMP_STATS_URL/);
  });

  it('rejects a token too short to be worth having', () => {
    expect(() => loadConfig(env({ API_TOKEN: 'short' }))).toThrow();
  });

  it('warns when the API is left open, and stays quiet when it is not', () => {
    expect(authWarning(loadConfig(env({})))).toMatch(/open to anyone/);
    expect(authWarning(loadConfig(env({ API_TOKEN: 'a'.repeat(32) })))).toBeNull();
  });
});

const snapshot = (o: Partial<StreamSnapshot>): StreamSnapshot => ({
  state: 'LIVE',
  bitrateKbps: 5000,
  fps: 30,
  droppedFrames: 0,
  uploadKbps: 5000,
  latencyMs: 30,
  packetLossPct: 0.1,
  publisherSince: null,
  source: 'test',
  observedAt: 0,
  ...o,
});

describe('SingleLinkNetworkProvider', () => {
  it('is UNKNOWN before the first stream snapshot, not DOWN', async () => {
    const snap = await new SingleLinkNetworkProvider(() => null).poll();
    expect(snap.links[0]).toMatchObject({ state: 'UNKNOWN', active: true });
  });

  it('mirrors the stream: up when live, down when not', async () => {
    const up = await new SingleLinkNetworkProvider(() => snapshot({})).poll();
    expect(up.links[0]).toMatchObject({ state: 'UP', latencyMs: 30, packetLossPct: 0.1 });

    const down = await new SingleLinkNetworkProvider(() => snapshot({ state: 'OFFLINE' })).poll();
    expect(down.links[0]?.state).toBe('DOWN');
  });

  it('reports no links at all when disabled, rather than inventing one', async () => {
    const snap = await new NoNetworkProvider().poll();
    expect(snap).toMatchObject({ mode: 'unknown', links: [], activeLinkId: null });
  });
});

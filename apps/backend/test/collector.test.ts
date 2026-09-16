import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, type NetworkSnapshot, type Settings, type StreamSnapshot } from '@nomadio/shared';
import { Collector } from '../src/core/collector.js';
import { DeviceRegistry } from '../src/core/devices.js';
import { Hub } from '../src/core/hub.js';
import { MarkerLog } from '../src/core/markers.js';

const live = (o: Partial<StreamSnapshot> = {}): StreamSnapshot => ({
  state: 'LIVE',
  bitrateKbps: 6000,
  fps: 30,
  droppedFrames: 0,
  uploadKbps: 6000,
  latencyMs: 40,
  packetLossPct: 0,
  publisherSince: null,
  source: 'test',
  observedAt: 0,
  ...o,
});

const network: NetworkSnapshot = { mode: 'single', links: [], activeLinkId: null, source: 'test', observedAt: 0 };
const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn() } as never;

function build(overrides: {
  stream?: () => Promise<StreamSnapshot>;
  network?: () => Promise<NetworkSnapshot>;
  settings?: Settings;
} = {}) {
  const hub = new Hub();
  const devices = new DeviceRegistry(60_000);
  const markers = new MarkerLog();
  const collector = new Collector({
    stream: { id: 'test', poll: overrides.stream ?? (async () => live()) },
    network: { id: 'test', poll: overrides.network ?? (async () => network) },
    devices,
    hub,
    markers,
    logger,
    intervalMs: 1000,
    settings: () => overrides.settings ?? DEFAULT_SETTINGS,
  });
  return { collector, hub, devices, markers };
}

const withLocation = (settings: Settings['privacy']['exposeLocation']): Settings => ({
  ...DEFAULT_SETTINGS,
  privacy: { exposeLocation: settings },
});

describe('Collector', () => {
  it('publishes each tick to the hub and caches it for late joiners', async () => {
    const { collector, hub } = build();
    const state = await collector.tick(1000);

    expect(state.stream.state).toBe('LIVE');
    expect(hub.latest()).toEqual(state);
  });

  it('reports UNKNOWN when the stream provider throws, rather than dying', async () => {
    const { collector } = build({
      stream: async () => {
        throw new Error('ingest gone');
      },
    });
    const state = await collector.tick();

    expect(state.stream.state).toBe('UNKNOWN');
    expect(state.stream.bitrateKbps).toBeNull();
  });

  it('keeps ticking when the network provider throws', async () => {
    const { collector } = build({
      network: async () => {
        throw new Error('agent gone');
      },
    });
    const state = await collector.tick();

    expect(state.network).toMatchObject({ mode: 'unknown', links: [], source: 'unavailable' });
    expect(state.stream.state).toBe('LIVE');
  });

  it('ends the session only after the publisher has been gone five minutes', async () => {
    let snapshot = live();
    const { collector } = build({ stream: async () => snapshot });

    await collector.tick(0);
    snapshot = live({ state: 'OFFLINE' });
    const soon = await collector.tick(60_000);
    expect(soon.session.sessionId).not.toBeNull();

    // The five minutes run from the first non-live tick, not from the last live one.
    const atTheLimit = await collector.tick(6 * 60_000);
    expect(atTheLimit.session.sessionId).not.toBeNull();

    const past = await collector.tick(6 * 60_000 + 1);
    expect(past.session.sessionId).toBeNull();
  });

  it('starts a fresh session when the stream returns after a long gap', async () => {
    let snapshot = live();
    const { collector } = build({ stream: async () => snapshot });

    const first = await collector.tick(0);
    snapshot = live({ state: 'OFFLINE' });
    await collector.tick(1000);
    await collector.tick(7 * 60_000);
    snapshot = live();
    const second = await collector.tick(8 * 60_000);

    expect(second.session.sessionId).not.toBeNull();
    expect(second.session.sessionId).not.toBe(first.session.sessionId);
  });
});

describe('location privacy', () => {
  const position = { lat: 14.599512, lon: 120.984222, altitudeM: 12, speedMps: 1.2, accuracyM: 5 };

  const tickWith = async (level: Settings['privacy']['exposeLocation']) => {
    const { collector, devices } = build({ settings: withLocation(level) });
    devices.ingest({ deviceId: 'iphone', location: position });
    return collector.tick();
  };

  it('withholds location entirely by default', async () => {
    const state = await tickWith('off');
    expect(state.devices[0]?.location).toBeNull();
  });

  it('rounds to about ten kilometres on coarse, and drops the accuracy', async () => {
    const state = await tickWith('coarse');
    expect(state.devices[0]?.location).toMatchObject({ lat: 14.6, lon: 121, accuracyM: null });
  });

  it('passes the exact position only when precise is chosen deliberately', async () => {
    const state = await tickWith('precise');
    expect(state.devices[0]?.location).toEqual(position);
  });
});

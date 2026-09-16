import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type DeviceState, type NetworkSnapshot, type StreamSnapshot } from '@nomadio/shared';
import { HealthEngine } from '../src/core/health.js';

const stream = (o: Partial<StreamSnapshot> = {}): StreamSnapshot => ({
  state: 'LIVE',
  bitrateKbps: 6000,
  fps: 30,
  droppedFrames: 0,
  uploadKbps: 6000,
  latencyMs: 100,
  packetLossPct: 0,
  publisherSince: null,
  source: 'test',
  observedAt: 0,
  ...o,
});
const network: NetworkSnapshot = { mode: 'single', links: [], activeLinkId: null, source: 'test', observedAt: 0 };
const base = { network, devices: [] as DeviceState[], settings: DEFAULT_SETTINGS };

describe('HealthEngine', () => {
  it('is quiet on a healthy stream', () => {
    expect(new HealthEngine().evaluate({ ...base, stream: stream() })).toEqual([]);
  });

  it('warns on low bitrate and keeps the original since timestamp', () => {
    const e = new HealthEngine();
    e.evaluate({ ...base, stream: stream({ bitrateKbps: 900 }) }, 1000);
    const later = e.evaluate({ ...base, stream: stream({ bitrateKbps: 900 }) }, 9000);
    expect(later[0]).toMatchObject({ id: 'low-bitrate', since: 1000, severity: 'warning' });
  });

  it('clears an alert once the condition resolves', () => {
    const e = new HealthEngine();
    e.evaluate({ ...base, stream: stream({ state: 'OFFLINE' }) }, 1000);
    expect(e.evaluate({ ...base, stream: stream() }, 2000)).toEqual([]);
  });

  it('ignores stale device telemetry', () => {
    const stale: DeviceState = { deviceId: 'iphone', batteryPct: 5, charging: false, updatedAt: 0, stale: true };
    expect(new HealthEngine().evaluate({ ...base, stream: stream(), devices: [stale] })).toEqual([]);
  });

  it('sorts critical alerts first', () => {
    const alerts = new HealthEngine().evaluate({ ...base, stream: stream({ state: 'OFFLINE', packetLossPct: 50 }) });
    expect(alerts[0]?.severity).toBe('critical');
  });
});

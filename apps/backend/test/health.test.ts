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

  it('warns on low bitrate and keeps the timestamp it started firing', () => {
    const e = new HealthEngine();
    [1000, 2000].forEach((t) => e.evaluate({ ...base, stream: stream({ bitrateKbps: 900 }) }, t));
    const firing = e.evaluate({ ...base, stream: stream({ bitrateKbps: 900 }) }, 3000);
    expect(firing[0]).toMatchObject({ id: 'low-bitrate', since: 3000, severity: 'warning' });
    const later = e.evaluate({ ...base, stream: stream({ bitrateKbps: 900 }) }, 9000);
    expect(later[0]).toMatchObject({ since: 3000 });
  });

  it('reports an offline stream immediately and clears it immediately', () => {
    const e = new HealthEngine();
    expect(e.evaluate({ ...base, stream: stream({ state: 'OFFLINE' }) }, 1000)[0]).toMatchObject({
      id: 'stream-offline',
    });
    expect(e.evaluate({ ...base, stream: stream() }, 2000)).toEqual([]);
  });

  it('ignores stale device telemetry', () => {
    const stale: DeviceState = { deviceId: 'iphone', batteryPct: 5, charging: false, updatedAt: 0, stale: true };
    expect(new HealthEngine().evaluate({ ...base, stream: stream(), devices: [stale] })).toEqual([]);
  });

  it('sorts critical alerts first', () => {
    const e = new HealthEngine();
    let alerts = [] as ReturnType<HealthEngine['evaluate']>;
    for (const t of [1000, 2000, 3000]) {
      alerts = e.evaluate({ ...base, stream: stream({ state: 'CONNECTING', packetLossPct: 50 }) }, t);
    }
    expect(alerts.map((a) => a.severity)).toEqual(['critical', 'warning']);
  });
});

describe('HealthEngine smoothing and hysteresis', () => {
  const run = (engine: HealthEngine, snapshots: StreamSnapshot[], t0 = 1000) =>
    snapshots.map((s, i) => engine.evaluate({ ...base, stream: s }, t0 + i * 1000));

  it('ignores a single bad sample', () => {
    const e = new HealthEngine();
    const results = run(e, [stream(), stream({ packetLossPct: 40 }), stream(), stream()]);
    expect(results.every((alerts) => alerts.length === 0)).toBe(true);
  });

  it('fires once a condition is confirmed across samples', () => {
    const e = new HealthEngine();
    const results = run(e, Array.from({ length: 4 }, () => stream({ packetLossPct: 40 })));
    expect(results[0]).toEqual([]);
    expect(results[1]).toEqual([]);
    expect(results[2]?.[0]).toMatchObject({ id: 'packet-loss' });
  });

  it('holds an alert through a brief recovery instead of flapping', () => {
    const e = new HealthEngine();
    run(e, Array.from({ length: 3 }, () => stream({ packetLossPct: 40 })));
    const recovering = run(e, [stream(), stream()], 9000);
    expect(recovering.every((alerts) => alerts.length === 1)).toBe(true);
    const cleared = run(e, Array.from({ length: 5 }, () => stream()), 20000);
    expect(cleared.at(-1)).toEqual([]);
  });

  it('judges bitrate on the median, not the latest jittery sample', () => {
    const e = new HealthEngine();
    // A sawtooth around the 2500 kbps target: half the samples are below it.
    const saw = [3400, 900, 3400, 900, 3400, 900].map((b) => stream({ bitrateKbps: b }));
    expect(run(e, saw).every((alerts) => alerts.length === 0)).toBe(true);
  });
});

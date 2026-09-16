import { describe, expect, it } from 'vitest';
import type { StreamSnapshot } from '@nomadio/shared';
import { SessionTracker } from '../src/core/session.js';

const snap = (state: StreamSnapshot['state'], bitrateKbps: number | null = 5000): StreamSnapshot => ({
  state,
  bitrateKbps,
  fps: 30,
  droppedFrames: 0,
  uploadKbps: bitrateKbps,
  latencyMs: 100,
  packetLossPct: 0,
  publisherSince: null,
  source: 'test',
  observedAt: 0,
});

describe('SessionTracker', () => {
  it('starts a session on the first LIVE snapshot and tracks duration', () => {
    const t = new SessionTracker();
    t.update(snap('OFFLINE'), 1000);
    expect(t.state(1000).sessionId).toBeNull();
    t.update(snap('LIVE'), 2000);
    expect(t.state(5000).durationMs).toBe(3000);
  });

  it('integrates bitrate into estimated bytes', () => {
    const t = new SessionTracker();
    t.update(snap('LIVE'), 0);
    t.update(snap('LIVE', 8000), 1000);
    expect(t.state(1000).estimatedBytes).toBe(1_000_000);
  });

  it('records an outage with its duration and treats CONNECTING as down', () => {
    const t = new SessionTracker();
    t.update(snap('LIVE'), 0);
    t.update(snap('OFFLINE', 0), 1000);
    t.update(snap('CONNECTING', 0), 2000);
    expect(t.state(2000).outages[0]).toMatchObject({ startedAt: 1000, endedAt: null });
    t.update(snap('LIVE'), 4000);
    expect(t.state(4000).outages[0]).toMatchObject({ startedAt: 1000, endedAt: 4000, durationMs: 3000 });
  });

  it('caps the integration step so a paused process cannot inflate data usage', () => {
    const t = new SessionTracker();
    t.update(snap('LIVE'), 0);
    t.update(snap('LIVE', 8000), 3_600_000);
    expect(t.state().estimatedBytes).toBe(10_000_000);
  });
});

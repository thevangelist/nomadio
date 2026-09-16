import type { StreamSnapshot } from '@nomadio/shared';
import type { StreamProvider } from '../types.js';

/** Deterministic-ish fake feed with a scripted outage, so the UI can be built offline. */
export class MockStreamProvider implements StreamProvider {
  readonly id = 'mock';
  private readonly startedAt = Date.now();

  async poll(): Promise<StreamSnapshot> {
    const t = (Date.now() - this.startedAt) / 1000;
    const outage = t % 180 > 150 && t % 180 < 168;
    const connecting = t % 180 >= 168 && t % 180 < 174;
    const wobble = Math.sin(t / 7) * 400;
    if (outage) {
      return {
        state: 'OFFLINE',
        bitrateKbps: 0,
        fps: 0,
        droppedFrames: null,
        uploadKbps: 0,
        latencyMs: null,
        packetLossPct: 100,
        publisherSince: null,
        source: this.id,
        observedAt: Date.now(),
      };
    }
    return {
      state: connecting ? 'CONNECTING' : 'LIVE',
      bitrateKbps: Math.round(5200 + wobble),
      fps: 30,
      droppedFrames: Math.floor(t / 30),
      uploadKbps: Math.round(5400 + wobble),
      latencyMs: Math.round(120 + Math.abs(wobble) / 8),
      packetLossPct: Number((Math.max(0, Math.sin(t / 11)) * 1.5).toFixed(2)),
      publisherSince: this.startedAt,
      source: this.id,
      observedAt: Date.now(),
    };
  }
}

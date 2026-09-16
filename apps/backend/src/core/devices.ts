import type { DeviceState, DeviceTelemetry } from '@nomadio/shared';

const MAX_DEVICES = 10;

/** Keyed by deviceId from day one, so a dedicated streaming phone is just another key. */
export class DeviceRegistry {
  private devices = new Map<string, DeviceState>();
  constructor(private readonly staleMs: number) {}

  ingest(t: DeviceTelemetry, now = Date.now()): DeviceState {
    const state: DeviceState = { ...t, updatedAt: now, stale: false };
    this.devices.set(t.deviceId, state);
    if (this.devices.size > MAX_DEVICES) {
      const oldest = [...this.devices.entries()].sort((a, b) => a[1].updatedAt - b[1].updatedAt)[0];
      if (oldest) this.devices.delete(oldest[0]);
    }
    return state;
  }

  list(now = Date.now()): DeviceState[] {
    return [...this.devices.values()].map((d) => ({ ...d, stale: now - d.updatedAt > this.staleMs }));
  }
}

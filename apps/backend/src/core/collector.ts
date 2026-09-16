import type { DashboardState, DeviceState, NetworkSnapshot, Settings, StreamSnapshot } from '@nomadio/shared';
import type { NetworkProvider, StreamProvider } from '../providers/types.js';
import type { Logger } from '../logger.js';
import { DeviceRegistry } from './devices.js';
import { HealthEngine } from './health.js';
import { Hub } from './hub.js';
import { SessionTracker } from './session.js';
import type { MarkerLog } from './markers.js';

const SESSION_END_AFTER_MS = 5 * 60_000;

/** One decimal degree is roughly 11 km — a town, not a street. */
const COARSE_DECIMALS = 1;

const roundTo = (value: number, decimals: number) => Number(value.toFixed(decimals));

function applyLocationPrivacy(device: DeviceState, level: Settings['privacy']['exposeLocation']): DeviceState {
  if (!device.location || level === 'off') return { ...device, location: null };
  if (level === 'precise') return device;
  return {
    ...device,
    location: {
      ...device.location,
      lat: roundTo(device.location.lat, COARSE_DECIMALS),
      lon: roundTo(device.location.lon, COARSE_DECIMALS),
      accuracyM: null,
    },
  };
}

export class Collector {
  private timer: NodeJS.Timeout | null = null;
  private lastStream: StreamSnapshot | null = null;
  private offlineSince: number | null = null;
  private readonly session = new SessionTracker();
  private readonly health = new HealthEngine();

  constructor(
    private readonly deps: {
      stream: StreamProvider;
      network: NetworkProvider;
      devices: DeviceRegistry;
      hub: Hub;
      logger: Logger;
      intervalMs: number;
      markers: MarkerLog;
      settings: () => Settings;
    },
  ) {}

  start(): void {
    if (this.timer) return;
    void this.tick();
    this.timer = setInterval(() => void this.tick(), this.deps.intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  latestStream = (): StreamSnapshot | null => this.lastStream;

  sessionStartedAt = (): number | null => this.session.state().startedAt;

  async tick(now = Date.now()): Promise<DashboardState> {
    const stream = await this.safeStream(() => this.deps.stream.poll(), 'stream');
    this.lastStream = stream;
    // A provider that throws must not stop the clock: the dashboard reporting
    // "unknown" is useful, a frozen dashboard is a lie.
    const network = await this.safeNetwork();

    this.session.update(stream, now);
    if (stream.state === 'LIVE') {
      this.offlineSince = null;
    } else {
      this.offlineSince ??= now;
      if (now - this.offlineSince > SESSION_END_AFTER_MS) this.session.endSession();
    }

    const devices = this.deps.devices.list(now);
    const settings = this.deps.settings();
    const state: DashboardState = {
      stream,
      network,
      devices: devices.map((d) => applyLocationPrivacy(d, settings.privacy.exposeLocation)),
      session: this.session.state(now),
      alerts: this.health.evaluate({ stream, network, devices, settings }, now),
      markers: this.deps.markers.list(20),
      serverTime: now,
    };
    this.deps.hub.publish(state);
    return state;
  }

  private async safeNetwork(): Promise<NetworkSnapshot> {
    try {
      return await this.deps.network.poll();
    } catch (err) {
      this.deps.logger.warn({ err, label: 'network' }, 'provider poll failed');
      return { mode: 'unknown', links: [], activeLinkId: null, source: 'unavailable', observedAt: Date.now() };
    }
  }

  private async safeStream(fn: () => Promise<StreamSnapshot>, label: string): Promise<StreamSnapshot> {
    try {
      return await fn();
    } catch (err) {
      this.deps.logger.warn({ err, label }, 'provider poll failed');
      return {
        state: 'UNKNOWN',
        bitrateKbps: null,
        fps: null,
        droppedFrames: null,
        uploadKbps: null,
        latencyMs: null,
        packetLossPct: null,
        publisherSince: null,
        source: label,
        observedAt: Date.now(),
      };
    }
  }
}

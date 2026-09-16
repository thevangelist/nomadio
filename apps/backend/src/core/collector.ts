import type { DashboardState, Settings, StreamSnapshot } from '@nomadio/shared';
import type { NetworkProvider, StreamProvider } from '../providers/types.js';
import type { Logger } from '../logger.js';
import { DeviceRegistry } from './devices.js';
import { HealthEngine } from './health.js';
import { Hub } from './hub.js';
import { SessionTracker } from './session.js';
import type { MarkerLog } from './markers.js';

const SESSION_END_AFTER_MS = 5 * 60_000;

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
    const stream = await this.safe(() => this.deps.stream.poll(), 'stream');
    this.lastStream = stream;
    const network = await this.deps.network.poll();

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
      devices: devices.map((d) => (settings.privacy.exposeLocation === 'precise' ? d : { ...d, location: null })),
      session: this.session.state(now),
      alerts: this.health.evaluate({ stream, network, devices, settings }, now),
      markers: this.deps.markers.list(20),
      serverTime: now,
    };
    this.deps.hub.publish(state);
    return state;
  }

  private async safe(fn: () => Promise<StreamSnapshot>, label: string): Promise<StreamSnapshot> {
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

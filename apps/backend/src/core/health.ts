import type { DeviceState, HealthAlert, NetworkSnapshot, Settings, StreamSnapshot } from '@nomadio/shared';

type Input = {
  stream: StreamSnapshot;
  network: NetworkSnapshot;
  devices: DeviceState[];
  settings: Settings;
  /** Median of the recent window, so a rule never fires on one jittery sample. */
  smoothed: { bitrateKbps: number | null; latencyMs: number | null; packetLossPct: number | null };
};

type Rule = {
  id: string;
  severity: HealthAlert['severity'];
  title: string;
  /**
   * Samples needed to raise and to clear. State rules answer a yes/no question and act at once;
   * measurement rules ride a noisy mobile uplink and have to be confirmed.
   */
  confirm?: number;
  evaluate(i: Input): string | null;
};

/** Rules are data, so V5 can add actuation without rewriting the engine. */
const RULES: Rule[] = [
  {
    id: 'stream-offline',
    confirm: 1,
    severity: 'critical',
    title: 'Stream offline',
    evaluate: ({ stream }) => (stream.state === 'OFFLINE' ? 'No publisher at the ingest.' : null),
  },
  {
    id: 'stream-connecting',
    confirm: 1,
    severity: 'warning',
    title: 'Reconnecting',
    evaluate: ({ stream }) => (stream.state === 'CONNECTING' ? 'Publisher is connecting but not yet live.' : null),
  },
  {
    id: 'no-telemetry',
    confirm: 1,
    severity: 'warning',
    title: 'No ingest telemetry',
    evaluate: ({ stream }) => (stream.state === 'UNKNOWN' ? `Cannot reach the ${stream.source} stats endpoint.` : null),
  },
  {
    id: 'low-bitrate',
    severity: 'warning',
    title: 'Bitrate below target',
    evaluate: ({ stream, settings, smoothed }) =>
      stream.state === 'LIVE' && smoothed.bitrateKbps !== null && smoothed.bitrateKbps < settings.thresholds.minBitrateKbps
        ? `${Math.round(smoothed.bitrateKbps)} kbps < ${settings.thresholds.minBitrateKbps} kbps target.`
        : null,
  },
  {
    id: 'high-latency',
    severity: 'warning',
    title: 'High latency',
    evaluate: ({ settings, smoothed }) =>
      smoothed.latencyMs !== null && smoothed.latencyMs > settings.thresholds.maxLatencyMs
        ? `RTT ${Math.round(smoothed.latencyMs)} ms.`
        : null,
  },
  {
    id: 'packet-loss',
    severity: 'critical',
    title: 'Packet loss',
    evaluate: ({ settings, smoothed }) =>
      smoothed.packetLossPct !== null && smoothed.packetLossPct > settings.thresholds.maxPacketLossPct
        ? `${smoothed.packetLossPct.toFixed(2)}% packets lost.`
        : null,
  },
  {
    id: 'low-battery',
    severity: 'warning',
    title: 'Low device battery',
    evaluate: ({ devices, settings }) => {
      const low = devices.filter(
        (d) => !d.stale && typeof d.batteryPct === 'number' && d.batteryPct <= settings.thresholds.lowBatteryPct && !d.charging,
      );
      return low.length ? low.map((d) => `${d.label ?? d.deviceId} at ${d.batteryPct}%`).join(', ') : null;
    },
  },
  {
    id: 'thermal',
    severity: 'critical',
    title: 'Device overheating',
    evaluate: ({ devices }) => {
      const hot = devices.filter((d) => !d.stale && (d.thermal === 'serious' || d.thermal === 'critical'));
      return hot.length ? hot.map((d) => `${d.label ?? d.deviceId}: ${d.thermal}`).join(', ') : null;
    },
  },
  {
    id: 'link-down',
    confirm: 1,
    severity: 'critical',
    title: 'Uplink down',
    evaluate: ({ network }) => {
      const down = network.links.filter((l) => l.state === 'DOWN');
      return down.length ? down.map((l) => l.label).join(', ') : null;
    },
  },
];

/** Short enough that the median tracks a real change, long enough to swallow one bad second. */
const WINDOW = 5;
const CONFIRM = 3;

type RuleState = { since: number; detail: string; hits: number; misses: number; firing: boolean };

export class HealthEngine {
  private state = new Map<string, RuleState>();
  private window: StreamSnapshot[] = [];

  evaluate(input: Omit<Input, 'smoothed'>, now = Date.now()): HealthAlert[] {
    this.window = [...this.window, input.stream].slice(-WINDOW);
    const full: Input = { ...input, smoothed: this.smoothed() };

    for (const rule of RULES) {
      const detail = rule.evaluate(full);
      const prev = this.state.get(rule.id) ?? { since: now, detail: '', hits: 0, misses: 0, firing: false };

      const confirm = rule.confirm ?? CONFIRM;
      if (detail !== null) {
        const hits = prev.hits + 1;
        const firing = prev.firing || hits >= confirm;
        this.state.set(rule.id, {
          since: prev.firing ? prev.since : now,
          detail,
          hits,
          misses: 0,
          firing,
        });
      } else {
        const misses = prev.misses + 1;
        if (misses >= confirm) this.state.delete(rule.id);
        else this.state.set(rule.id, { ...prev, hits: 0, misses });
      }
    }

    const alerts: HealthAlert[] = [];
    for (const rule of RULES) {
      const s = this.state.get(rule.id);
      if (!s?.firing) continue;
      alerts.push({ id: rule.id, severity: rule.severity, title: rule.title, detail: s.detail, since: s.since });
    }
    return alerts.sort((a, b) => (a.severity === b.severity ? a.since - b.since : a.severity === 'critical' ? -1 : 1));
  }

  private smoothed(): Input['smoothed'] {
    const median = (pick: (s: StreamSnapshot) => number | null): number | null => {
      const values = this.window.map(pick).filter((v): v is number => v !== null).sort((a, b) => a - b);
      if (values.length === 0) return null;
      return values[Math.floor(values.length / 2)]!;
    };
    return {
      bitrateKbps: median((s) => s.bitrateKbps),
      latencyMs: median((s) => s.latencyMs),
      packetLossPct: median((s) => s.packetLossPct),
    };
  }
}

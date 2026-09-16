import type { DeviceState, HealthAlert, NetworkSnapshot, Settings, StreamSnapshot } from '@nomadio/shared';

type Input = {
  stream: StreamSnapshot;
  network: NetworkSnapshot;
  devices: DeviceState[];
  settings: Settings;
};

type Rule = {
  id: string;
  severity: HealthAlert['severity'];
  title: string;
  evaluate(i: Input): string | null;
};

/** Rules are data, so V5 can add actuation without rewriting the engine. */
const RULES: Rule[] = [
  {
    id: 'stream-offline',
    severity: 'critical',
    title: 'Stream offline',
    evaluate: ({ stream }) => (stream.state === 'OFFLINE' ? 'No publisher at the ingest.' : null),
  },
  {
    id: 'stream-connecting',
    severity: 'warning',
    title: 'Reconnecting',
    evaluate: ({ stream }) => (stream.state === 'CONNECTING' ? 'Publisher is connecting but not yet live.' : null),
  },
  {
    id: 'no-telemetry',
    severity: 'warning',
    title: 'No ingest telemetry',
    evaluate: ({ stream }) => (stream.state === 'UNKNOWN' ? `Cannot reach the ${stream.source} stats endpoint.` : null),
  },
  {
    id: 'low-bitrate',
    severity: 'warning',
    title: 'Bitrate below target',
    evaluate: ({ stream, settings }) =>
      stream.state === 'LIVE' && stream.bitrateKbps !== null && stream.bitrateKbps < settings.thresholds.minBitrateKbps
        ? `${Math.round(stream.bitrateKbps)} kbps < ${settings.thresholds.minBitrateKbps} kbps target.`
        : null,
  },
  {
    id: 'high-latency',
    severity: 'warning',
    title: 'High latency',
    evaluate: ({ stream, settings }) =>
      stream.latencyMs !== null && stream.latencyMs > settings.thresholds.maxLatencyMs
        ? `RTT ${Math.round(stream.latencyMs)} ms.`
        : null,
  },
  {
    id: 'packet-loss',
    severity: 'critical',
    title: 'Packet loss',
    evaluate: ({ stream, settings }) =>
      stream.packetLossPct !== null && stream.packetLossPct > settings.thresholds.maxPacketLossPct
        ? `${stream.packetLossPct}% packets lost.`
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
    severity: 'critical',
    title: 'Uplink down',
    evaluate: ({ network }) => {
      const down = network.links.filter((l) => l.state === 'DOWN');
      return down.length ? down.map((l) => l.label).join(', ') : null;
    },
  },
];

export class HealthEngine {
  private since = new Map<string, number>();

  evaluate(input: Input, now = Date.now()): HealthAlert[] {
    const alerts: HealthAlert[] = [];
    const seen = new Set<string>();
    for (const rule of RULES) {
      const detail = rule.evaluate(input);
      if (detail === null) continue;
      seen.add(rule.id);
      if (!this.since.has(rule.id)) this.since.set(rule.id, now);
      alerts.push({ id: rule.id, severity: rule.severity, title: rule.title, detail, since: this.since.get(rule.id)! });
    }
    for (const id of this.since.keys()) if (!seen.has(id)) this.since.delete(id);
    return alerts.sort((a, b) => (a.severity === b.severity ? a.since - b.since : a.severity === 'critical' ? -1 : 1));
  }
}

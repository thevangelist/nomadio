import { z } from 'zod';

export const StreamState = z.enum(['OFFLINE', 'CONNECTING', 'LIVE', 'UNKNOWN']);
export type StreamState = z.infer<typeof StreamState>;

/** Every numeric metric is nullable: null means "no source provides this", never zero. */
const num = z.number().nullable();

export const StreamSnapshot = z.object({
  state: StreamState,
  bitrateKbps: num,
  fps: num,
  droppedFrames: num,
  uploadKbps: num,
  latencyMs: num,
  packetLossPct: num,
  publisherSince: z.number().nullable(),
  source: z.string(),
  observedAt: z.number(),
});
export type StreamSnapshot = z.infer<typeof StreamSnapshot>;

export const LinkSnapshot = z.object({
  id: z.string(),
  label: z.string(),
  state: z.enum(['UP', 'DOWN', 'DEGRADED', 'UNKNOWN']),
  active: z.boolean(),
  latencyMs: num,
  packetLossPct: num,
  uploadKbps: num,
});
export type LinkSnapshot = z.infer<typeof LinkSnapshot>;

export const NetworkSnapshot = z.object({
  mode: z.enum(['single', 'bonded', 'unknown']),
  links: z.array(LinkSnapshot),
  activeLinkId: z.string().nullable(),
  source: z.string(),
  observedAt: z.number(),
});
export type NetworkSnapshot = z.infer<typeof NetworkSnapshot>;

export const ThermalState = z.enum(['nominal', 'fair', 'serious', 'critical', 'unknown']);

/** Posted by an iPhone Shortcut or a companion app. See docs/02-data-availability.md. */
export const DeviceTelemetry = z.object({
  deviceId: z.string().min(1).max(64),
  label: z.string().max(64).optional(),
  batteryPct: z.number().min(0).max(100).nullable().optional(),
  charging: z.boolean().nullable().optional(),
  thermal: ThermalState.optional(),
  carrier: z.string().max(64).nullable().optional(),
  radioTech: z.string().max(32).nullable().optional(),
  location: z
    .object({
      lat: z.number(),
      lon: z.number(),
      altitudeM: z.number().nullable().optional(),
      speedMps: z.number().nullable().optional(),
      accuracyM: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
});
export type DeviceTelemetry = z.infer<typeof DeviceTelemetry>;

export const DeviceState = DeviceTelemetry.extend({ updatedAt: z.number(), stale: z.boolean() });
export type DeviceState = z.infer<typeof DeviceState>;

export const Outage = z.object({
  startedAt: z.number(),
  endedAt: z.number().nullable(),
  durationMs: z.number().nullable(),
});
export type Outage = z.infer<typeof Outage>;

export const SessionState = z.object({
  sessionId: z.string().nullable(),
  startedAt: z.number().nullable(),
  durationMs: z.number(),
  estimatedBytes: z.number(),
  outages: z.array(Outage),
});
export type SessionState = z.infer<typeof SessionState>;

export const Marker = z.object({
  id: z.string(),
  at: z.number(),
  sessionOffsetMs: z.number().nullable(),
  note: z.string().max(200),
  streamState: StreamState,
});
export type Marker = z.infer<typeof Marker>;

export const HealthAlert = z.object({
  id: z.string(),
  severity: z.enum(['info', 'warning', 'critical']),
  title: z.string(),
  detail: z.string(),
  since: z.number(),
});
export type HealthAlert = z.infer<typeof HealthAlert>;

export const DashboardState = z.object({
  stream: StreamSnapshot,
  network: NetworkSnapshot,
  devices: z.array(DeviceState),
  session: SessionState,
  alerts: z.array(HealthAlert),
  markers: z.array(Marker),
  serverTime: z.number(),
});
export type DashboardState = z.infer<typeof DashboardState>;

export const Settings = z.object({
  privacy: z.object({ exposeLocation: z.enum(['off', 'coarse', 'precise']) }),
  autoQualityLadder: z.object({ enabled: z.boolean() }),
  thresholds: z.object({
    minBitrateKbps: z.number(),
    maxLatencyMs: z.number(),
    maxPacketLossPct: z.number(),
    lowBatteryPct: z.number(),
  }),
});
export type Settings = z.infer<typeof Settings>;

export const DEFAULT_SETTINGS: Settings = {
  privacy: { exposeLocation: 'off' },
  autoQualityLadder: { enabled: false },
  thresholds: { minBitrateKbps: 2500, maxLatencyMs: 800, maxPacketLossPct: 2, lowBatteryPct: 20 },
};

export type WsMessage =
  | { type: 'state'; payload: DashboardState }
  | { type: 'settings'; payload: Settings };

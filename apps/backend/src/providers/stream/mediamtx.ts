import type { StreamSnapshot } from '@nomadio/shared';
import { offlineStream, unknownStream, type StreamProvider } from '../types.js';

type Json = Record<string, unknown>;
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

const pick = (o: Json, ...keys: string[]): number | null => {
  for (const k of keys) {
    const v = num(o[k]);
    if (v !== null) return v;
  }
  return null;
};

/**
 * MediaMTX control API (v3). Paths tell us whether a publisher is connected and how many bytes
 * arrived; the SRT connection list is where loss and RTT live, so RTMP publishing yields neither.
 * Field names are checked against several spellings because they have moved between releases.
 */
export class MediaMtxStreamProvider implements StreamProvider {
  readonly id = 'mediamtx';
  private lastBytes: { at: number; bytes: number } | null = null;

  constructor(private readonly apiUrl: string, private readonly path: string) {}

  async poll(): Promise<StreamSnapshot> {
    const pathInfo = await this.get<Json>(`/v3/paths/get/${encodeURIComponent(this.path)}`);
    if (pathInfo === null) return unknownStream(this.id);

    const ready = pathInfo['ready'] === true;
    const bytes = pick(pathInfo, 'bytesReceived', 'inboundBytes');
    const bitrateKbps = this.deriveBitrate(bytes, ready);

    if (!ready) {
      this.lastBytes = null;
      return { ...offlineStream(this.id), bitrateKbps: bytes === null ? null : 0 };
    }

    const srt = await this.srtConnection();
    const srtKbps = srt ? mbpsToKbps(pick(srt, 'mbpsReceiveRate')) : null;
    const lost = srt ? pick(srt, 'packetsReceivedLoss', 'packetsRecvLoss') : null;
    const received = srt ? pick(srt, 'packetsReceived', 'packetsRecv') : null;

    return {
      state: 'LIVE',
      bitrateKbps: srtKbps ?? bitrateKbps,
      fps: null, // MediaMTX reports tracks and codecs, not a frame rate
      droppedFrames: pick(pathInfo, 'inboundFramesInError'),
      uploadKbps: srtKbps ?? bitrateKbps,
      latencyMs: srt ? pick(srt, 'msRTT') : null,
      packetLossPct: lossPct(lost, received),
      publisherSince: readyTime(pathInfo['readyTime']),
      source: this.id,
      observedAt: Date.now(),
    };
  }

  /** RTMP publishers report no rate, so it is integrated from the byte counter instead. */
  private deriveBitrate(bytes: number | null, ready: boolean): number | null {
    const now = Date.now();
    if (bytes === null || !ready) return null;
    const prev = this.lastBytes;
    this.lastBytes = { at: now, bytes };
    if (!prev || now <= prev.at) return null;
    const seconds = (now - prev.at) / 1000;
    return Math.round(((bytes - prev.bytes) * 8) / seconds / 1000);
  }

  private async srtConnection(): Promise<Json | null> {
    const list = await this.get<Json>('/v3/srtconns/list');
    const items = list?.['items'];
    if (!Array.isArray(items)) return null;
    return (items as Json[]).find((c) => c['path'] === this.path) ?? null;
  }

  private async get<T>(path: string): Promise<T | null> {
    try {
      const res = await fetch(`${this.apiUrl}${path}`, { signal: AbortSignal.timeout(2500) });
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      return null;
    }
  }
}

const mbpsToKbps = (v: number | null) => (v === null ? null : Math.round(v * 1000));

const lossPct = (lost: number | null, received: number | null): number | null => {
  if (lost === null || received === null || received <= 0) return null;
  return Number(((lost / (lost + received)) * 100).toFixed(2));
};

const readyTime = (v: unknown): number | null => {
  if (typeof v !== 'string') return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : t;
};

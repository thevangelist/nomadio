import type { StreamSnapshot } from '@nomadio/shared';
import { offlineStream, unknownStream, type StreamProvider } from '../types.js';

type Json = Record<string, unknown>;
const n = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/**
 * SRT Live Server / srt-live-transmit style JSON stats.
 * Field names differ between builds, so each metric is looked up across known aliases and
 * falls back to null rather than to a guess.
 */
export class SrtStreamProvider implements StreamProvider {
  readonly id = 'srt';
  constructor(private readonly url: string, private readonly streamId?: string) {}

  async poll(): Promise<StreamSnapshot> {
    let body: Json;
    try {
      const res = await fetch(this.url, { signal: AbortSignal.timeout(2500) });
      if (!res.ok) return unknownStream(this.id);
      body = (await res.json()) as Json;
    } catch {
      return unknownStream(this.id);
    }

    const pub = this.findPublisher(body);
    if (!pub) return offlineStream(this.id);

    const pick = (...keys: string[]) => {
      for (const k of keys) {
        const v = n(pub[k]);
        if (v !== null) return v;
      }
      return null;
    };

    const bitrateKbps = pick('bitrate', 'mbpsRecvRate') ?? null;
    return {
      state: 'LIVE',
      bitrateKbps: bitrateKbps !== null && bitrateKbps < 100 ? Math.round(bitrateKbps * 1000) : bitrateKbps,
      fps: pick('fps'),
      droppedFrames: pick('pktRcvDrop', 'dropped'),
      uploadKbps: bitrateKbps,
      latencyMs: pick('msRTT', 'rtt'),
      packetLossPct: this.lossPct(pick('pktRcvLoss'), pick('pktRecv', 'pktRcv')),
      publisherSince: null,
      source: this.id,
      observedAt: Date.now(),
    };
  }

  private lossPct(lost: number | null, received: number | null): number | null {
    if (lost === null || received === null || received <= 0) return null;
    return Number(((lost / (lost + received)) * 100).toFixed(2));
  }

  private findPublisher(body: Json): Json | undefined {
    const groups = (body['publishers'] ?? body['streams'] ?? body['publisher']) as unknown;
    if (Array.isArray(groups)) {
      const list = groups as Json[];
      if (!this.streamId) return list[0];
      return list.find((p) => String(p['streamid'] ?? p['name'] ?? '').includes(this.streamId!)) ?? undefined;
    }
    if (groups && typeof groups === 'object') {
      const entries = Object.entries(groups as Json);
      const hit = this.streamId ? entries.find(([k]) => k.includes(this.streamId!)) : entries[0];
      return hit ? (hit[1] as Json) : undefined;
    }
    return undefined;
  }
}

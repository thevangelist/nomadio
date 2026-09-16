import type { StreamSnapshot } from '@nomadio/shared';
import { offlineStream, unknownStream, type StreamProvider } from '../types.js';

const tag = (xml: string, name: string): string | null => {
  const m = new RegExp(`<${name}>([^<]*)</${name}>`).exec(xml);
  return m?.[1] ?? null;
};
const numTag = (xml: string, name: string): number | null => {
  const v = tag(xml, name);
  const parsed = v === null ? NaN : Number(v);
  return Number.isFinite(parsed) ? parsed : null;
};

/** nginx-rtmp-module stat.xml. Minimal regex parse: the document is small and fixed-shape. */
export class NginxRtmpStreamProvider implements StreamProvider {
  readonly id = 'nginx-rtmp';
  constructor(private readonly url: string, private readonly app: string, private readonly key?: string) {}

  async poll(): Promise<StreamSnapshot> {
    let xml: string;
    try {
      const res = await fetch(this.url, { signal: AbortSignal.timeout(2500) });
      if (!res.ok) return unknownStream(this.id);
      xml = await res.text();
    } catch {
      return unknownStream(this.id);
    }

    const appBlock = this.section(xml, 'application', this.app);
    if (!appBlock) return offlineStream(this.id);
    const stream = this.key ? this.section(appBlock, 'stream', this.key) : this.firstStream(appBlock);
    if (!stream) return offlineStream(this.id);

    const bwIn = numTag(stream, 'bw_in');
    const publishing = /<publishing\s*\/?>/.test(stream);
    return {
      state: publishing ? 'LIVE' : 'CONNECTING',
      bitrateKbps: bwIn === null ? null : Math.round(bwIn / 1000),
      fps: numTag(stream, 'frame_rate'),
      droppedFrames: null,
      uploadKbps: bwIn === null ? null : Math.round(bwIn / 1000),
      latencyMs: null,
      packetLossPct: null,
      publisherSince: this.since(numTag(stream, 'time')),
      source: this.id,
      observedAt: Date.now(),
    };
  }

  private since(ms: number | null) {
    return ms === null ? null : Date.now() - ms;
  }

  private firstStream(appBlock: string): string | null {
    const m = /<stream>([\s\S]*?)<\/stream>/.exec(appBlock);
    return m?.[1] ?? null;
  }

  private section(xml: string, tagName: string, name: string): string | null {
    const re = new RegExp(`<${tagName}>([\\s\\S]*?)</${tagName}>`, 'g');
    for (const m of xml.matchAll(re)) {
      const body = m[1] ?? '';
      if (tag(body, 'name') === name) return body;
    }
    return null;
  }
}

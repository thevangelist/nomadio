import { afterEach, describe, expect, it, vi } from 'vitest';
import { NginxRtmpStreamProvider } from '../src/providers/stream/nginxRtmp.js';
import { SrtStreamProvider } from '../src/providers/stream/srt.js';

const serve = (body: unknown, ok = true) =>
  vi.stubGlobal('fetch', async () => ({
    ok,
    json: async () => body,
    text: async () => String(body),
  }));

afterEach(() => vi.unstubAllGlobals());

describe('SrtStreamProvider', () => {
  it('is OFFLINE when the stats document has no publisher', async () => {
    serve({ publishers: [] });
    expect((await new SrtStreamProvider('http://sls:8181/stats').poll()).state).toBe('OFFLINE');
  });

  it('is UNKNOWN when the endpoint errors or is unreachable', async () => {
    serve({}, false);
    expect((await new SrtStreamProvider('http://sls:8181/stats').poll()).state).toBe('UNKNOWN');
    vi.stubGlobal('fetch', async () => {
      throw new Error('refused');
    });
    expect((await new SrtStreamProvider('http://sls:8181/stats').poll()).state).toBe('UNKNOWN');
  });

  it('reads a publisher and derives the loss percentage', async () => {
    serve({ publishers: [{ streamid: 'live', bitrate: 4200, fps: 30, msRTT: 55, pktRcvLoss: 10, pktRcv: 990 }] });
    const snap = await new SrtStreamProvider('http://sls:8181/stats').poll();
    expect(snap).toMatchObject({ state: 'LIVE', bitrateKbps: 4200, fps: 30, latencyMs: 55, packetLossPct: 1 });
  });

  it('treats a small bitrate as Mbps, since builds disagree on the unit', async () => {
    serve({ publishers: [{ bitrate: 5.4 }] });
    expect((await new SrtStreamProvider('http://sls:8181/stats').poll()).bitrateKbps).toBe(5400);
  });

  it('picks the publisher matching the configured stream id', async () => {
    serve({ publishers: [{ streamid: 'other', bitrate: 1000 }, { streamid: 'live/main', bitrate: 8000 }] });
    expect((await new SrtStreamProvider('http://sls:8181/stats', 'live').poll()).bitrateKbps).toBe(8000);
  });

  it('leaves unavailable fields null rather than zero', async () => {
    serve({ publishers: [{ streamid: 'live', bitrate: 4200 }] });
    const snap = await new SrtStreamProvider('http://sls:8181/stats').poll();
    expect(snap.fps).toBeNull();
    expect(snap.latencyMs).toBeNull();
    expect(snap.packetLossPct).toBeNull();
  });
});

const statXml = (streamBody: string) =>
  `<rtmp><server><application><name>live</name><live>${streamBody}</live></application></server></rtmp>`;

describe('NginxRtmpStreamProvider', () => {
  it('is OFFLINE when the application has no stream', async () => {
    serve(statXml(''));
    expect((await new NginxRtmpStreamProvider('http://h/stat', 'live').poll()).state).toBe('OFFLINE');
  });

  it('is OFFLINE when the configured application is absent', async () => {
    serve(statXml('<stream><name>x</name></stream>').replace('<name>live</name>', '<name>other</name>'));
    expect((await new NginxRtmpStreamProvider('http://h/stat', 'live').poll()).state).toBe('OFFLINE');
  });

  it('converts bw_in to kbps and reads the frame rate', async () => {
    serve(statXml('<stream><name>main</name><bw_in>4200000</bw_in><frame_rate>30</frame_rate><time>5000</time><publishing/></stream>'));
    const snap = await new NginxRtmpStreamProvider('http://h/stat', 'live').poll();
    expect(snap).toMatchObject({ state: 'LIVE', bitrateKbps: 4200, uploadKbps: 4200, fps: 30 });
    expect(snap.publisherSince).toBeGreaterThan(0);
  });

  it('is CONNECTING while a stream exists but is not publishing', async () => {
    serve(statXml('<stream><name>main</name><bw_in>0</bw_in></stream>'));
    expect((await new NginxRtmpStreamProvider('http://h/stat', 'live').poll()).state).toBe('CONNECTING');
  });

  it('never reports latency or loss, which RTMP does not carry', async () => {
    serve(statXml('<stream><name>main</name><bw_in>4200000</bw_in><publishing/></stream>'));
    const snap = await new NginxRtmpStreamProvider('http://h/stat', 'live').poll();
    expect(snap.latencyMs).toBeNull();
    expect(snap.packetLossPct).toBeNull();
    expect(snap.droppedFrames).toBeNull();
  });
});

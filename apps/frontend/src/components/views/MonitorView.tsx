import type { DashboardState, StreamState } from '@nomadio/shared';
import { bytes, clock, duration, fmt, mbps } from '@/lib/format';
import { Card, Metric, Row } from '../Primitives';

const STATE_COLOR: Record<StreamState, string> = {
  LIVE: 'var(--ok)',
  CONNECTING: 'var(--warn)',
  OFFLINE: 'var(--crit)',
  UNKNOWN: 'var(--idle)',
};

export default function MonitorView({ state }: { state: DashboardState }) {
  const { stream, session, alerts } = state;
  const staleSec = Math.round((Date.now() - stream.observedAt) / 1000);

  return (
    <>
      <div className="banner" style={{ ['--state' as string]: STATE_COLOR[stream.state] }}>
        <h2>{stream.state}</h2>
        <div className="meta">
          <div>{duration(session.durationMs)}</div>
          <div>
            {stream.source}
            {staleSec > 5 ? ` · ${staleSec}s stale` : ''}
          </div>
        </div>
      </div>

      {alerts.map((a) => (
        <div key={a.id} className={`alert ${a.severity}`}>
          <div className="t">{a.title}</div>
          <div className="d">
            {a.detail} · since {clock(a.since)}
          </div>
        </div>
      ))}

      <div className="grid">
        <Metric label="Bitrate" value={mbps(stream.bitrateKbps)} caption="at the ingest" />
        <Metric label="FPS" value={fmt(stream.fps, 'fps')} caption="published" />
        <Metric label="Upload" value={mbps(stream.uploadKbps)} caption="what arrived" />
        <Metric label="Latency" value={fmt(stream.latencyMs, 'ms')} caption="RTT" />
        <Metric label="Packet loss" value={fmt(stream.packetLossPct, '%', 2)} caption="SRT only" tone="warn" />
        <Metric label="Dropped" value={fmt(stream.droppedFrames, '')} caption="frames" />
      </div>

      <Card title="Session">
        <Row k="Started" v={clock(session.startedAt)} />
        <Row k="Duration" v={duration(session.durationMs)} />
        <Row k="Estimated data" v={bytes(session.estimatedBytes)} />
        <Row k="Outages" v={String(session.outages.length)} />
        {session.outages.slice(0, 3).map((o) => (
          <Row
            key={o.startedAt}
            dot={o.endedAt === null ? 'crit' : 'warn'}
            k={clock(o.startedAt)}
            v={o.durationMs === null ? 'ongoing' : duration(o.durationMs)}
          />
        ))}
      </Card>
    </>
  );
}

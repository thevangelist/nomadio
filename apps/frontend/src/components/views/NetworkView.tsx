import type { DashboardState } from '@nomadio/shared';
import { fmt, mbps } from '@/lib/format';
import { Card, Row, type Dot } from '../Primitives';

const linkDot = (s: string): Dot => (s === 'UP' ? 'ok' : s === 'DEGRADED' ? 'warn' : s === 'DOWN' ? 'crit' : 'idle');

export default function NetworkView({ state }: { state: DashboardState }) {
  const { network } = state;
  return (
    <>
      <Card title={`Uplink · ${network.mode}`}>
        {network.links.length === 0 ? (
          <p className="note">No network provider configured.</p>
        ) : (
          network.links.map((l) => (
            <Row
              key={l.id}
              dot={linkDot(l.state)}
              k={`${l.label}${l.active ? ' · active' : ''}`}
              v={`${mbps(l.uploadKbps)} · ${fmt(l.latencyMs, 'ms')} · ${fmt(l.packetLossPct, '%', 2)}`}
            />
          ))
        )}
      </Card>

      <Card title="Bonding">
        <p className="note">
          Speedify has no cloud API. Link A/B, packet loss per link and failover events need the
          Nomadio agent running on the bonding machine, shelling out to <span className="mono">speedify_cli</span>.
          If bonding runs on the iPhone itself, nothing can be read at all. That is V2.
        </p>
      </Card>
    </>
  );
}

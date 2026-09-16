import type { DashboardState } from '@nomadio/shared';
import { clock } from '@/lib/format';
import { Card, Row } from '../Primitives';

export default function DevicesView({ state }: { state: DashboardState }) {
  const { devices } = state;
  return (
    <>
      {devices.length === 0 ? (
        <Card title="Devices">
          <p className="note">
            No device telemetry. iOS gives a web page nothing about the battery or the modem —
            install the Shortcut from the README to post it to /api/v1/telemetry.
          </p>
        </Card>
      ) : (
        devices.map((d) => (
          <Card key={d.deviceId} title={d.label ?? d.deviceId}>
            <Row
              k="Battery"
              dot={d.stale ? 'idle' : typeof d.batteryPct === 'number' && d.batteryPct < 20 ? 'crit' : 'ok'}
              v={typeof d.batteryPct === 'number' ? `${d.batteryPct}%${d.charging ? ' charging' : ''}` : '—'}
            />
            <Row k="Thermal" v={d.thermal && d.thermal !== 'unknown' ? d.thermal : '— (needs native app)'} />
            <Row k="Carrier" v={d.carrier ?? '—'} />
            <Row k="Radio" v={d.radioTech ?? '—'} />
            <Row k="Updated" v={`${clock(d.updatedAt)}${d.stale ? ' · stale' : ''}`} />
          </Card>
        ))
      )}

      <Card title="Cameras">
        <Row k="iPhone 16" v="primary · encoder" dot="ok" />
        <Row k="GoPro HERO12" v="no telemetry · V3" dot="idle" />
        <Row k="DJI Mini 4" v="video source only · no SDK" dot="idle" />
      </Card>
    </>
  );
}

import type { DashboardState } from '@nomadio/shared';
import { Card, Row } from '../Primitives';

/** Onboarding. Answers "how do I get this pointed at my own rig" without leaving the app. */
export default function SetupView({ state }: { state: DashboardState }) {
  const mock = state.stream.source === 'mock';
  const hasDevice = state.devices.length > 0;

  return (
    <>
      <Card title="Step 1 · Point it at your stream">
        <Row
          dot={mock ? 'warn' : 'ok'}
          k="Stream source"
          sub={mock ? 'Showing demo data, not your rig' : 'Reading real ingest stats'}
          v={state.stream.source}
        />
        <p className="note" style={{ marginTop: 12 }}>
          The numbers come from whatever receives your stream. Pick the one you already have:
        </p>
        <p className="note">
          <strong>OBS at home.</strong> Add a Media Source with an SRT or RTMP input, or run
          MediaMTX beside OBS, then set <span className="mono">STREAM_PROVIDER=srt</span> and{' '}
          <span className="mono">SRT_STATS_URL</span>. The phone publishes to the home PC, OBS
          mixes, OBS pushes to YouTube.
        </p>
        <p className="note">
          <strong>Phone straight to YouTube.</strong> Nothing local receives the stream, so there
          are no ingest stats to read. Battery, checklist and markers still work; bitrate does not.
        </p>
      </Card>

      <Card title="Step 2 · Phone telemetry">
        <Row
          dot={hasDevice ? 'ok' : 'warn'}
          k="Devices reporting"
          sub={hasDevice ? undefined : 'Battery is unknown until a Shortcut posts it'}
          v={String(state.devices.length)}
        />
        <p className="note" style={{ marginTop: 12 }}>
          Shortcuts → Automation → <em>Battery Level changes</em> → Get Battery Level → Get
          Contents of URL. POST to <span className="mono">/api/v1/telemetry</span> with the header{' '}
          <span className="mono">Authorization: Bearer &lt;token&gt;</span> and a JSON body of
          deviceId, label and batteryPct.
        </p>
      </Card>

      <Card title="Step 3 · Install the dashboard">
        <p className="note">
          Open this page on the phone, Share → Add to Home Screen. It runs full screen, keeps
          working on a bad link, and reconnects on its own.
        </p>
      </Card>

      <Card title="What your gear can and cannot report">
        <Row k="iPhone 16" sub="camera, encoder, battery via Shortcut" v="partial" dot="ok" />
        <Row k="GoPro HERO12" sub="HTTP API needs its own Wi-Fi — V3" v="none" dot="idle" />
        <Row k="DJI Mini 4" sub="no public SDK; video source only" v="none" dot="idle" />
        <Row k="DJI Mic Mini 2" sub="no API; levels readable at OBS later" v="none" dot="idle" />
        <Row k="GP26 mount, power bank" sub="nothing to read; checklist items" v="none" dot="idle" />
        <Row k="Apple Watch" sub="optional, via Shortcut — V4" v="none" dot="idle" />
      </Card>
    </>
  );
}

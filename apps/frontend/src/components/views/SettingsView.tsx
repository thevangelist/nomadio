import { useEffect, useState } from 'react';
import type { Settings } from '@nomadio/shared';
import { apiFetch, hasToken, setToken } from '@/lib/api';
import { Card, Row } from '../Primitives';
import Select from '../ui/Select';

export default function SettingsView() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/v1/settings')
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => setError('could not load settings'));
  }, []);

  const patch = async (body: Partial<Settings>) => {
    const res = await apiFetch('/api/v1/settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (res.ok) setSettings(json);
    else setError(typeof json.error === 'string' ? json.error : 'update rejected');
  };

  if (!settings) return <p className="note">{error ?? 'Loading settings…'}</p>;

  return (
    <>
      <Card title="Privacy">
        <div className="row">
          <span className="k">Location exposure</span>
          <Select
            aria-label="Location exposure"
            value={settings.privacy.exposeLocation}
            onValueChange={(v) => void patch({ privacy: { exposeLocation: v as 'off' } })}
            options={[
              { value: 'off', label: 'off' },
              { value: 'coarse', label: 'coarse' },
              { value: 'precise', label: 'precise' },
            ]}
          />
        </div>
        <p className="note" style={{ marginTop: 8 }}>
          Off is the default and the overlay must be useful without location. Precise GPS on a
          live stream tells strangers exactly where you are standing.
        </p>
      </Card>

      <Card title="Thresholds">
        <Row k="Min bitrate" v={`${settings.thresholds.minBitrateKbps} kbps`} />
        <Row k="Max latency" v={`${settings.thresholds.maxLatencyMs} ms`} />
        <Row k="Max packet loss" v={`${settings.thresholds.maxPacketLossPct} %`} />
        <Row k="Low battery" v={`${settings.thresholds.lowBatteryPct} %`} />
      </Card>

      <Card title="Access">
        <div className="row">
          <span className="k">
            API token
            <span className="sub">{hasToken() ? 'stored on this device' : 'not set — needed once the API is exposed'}</span>
          </span>
          <input
            type="password"
            placeholder="paste token"
            style={{ maxWidth: 150 }}
            onChange={(e) => setToken(e.target.value)}
          />
        </div>
        <p className="note" style={{ marginTop: 8 }}>
          Opening the dashboard with <span className="mono">?token=…</span> stores it and strips it from the
          address bar, so a link is enough to set up a new device.
        </p>
      </Card>

      <Card title="Automation">
        <Row k="Auto quality ladder" v={settings.autoQualityLadder.enabled ? 'on' : 'off · V5'} />
        <p className="note" style={{ marginTop: 8 }}>
          Nothing changes your stream automatically. The API refuses to enable this until the
          phone-side control path is verified to exist.
        </p>
      </Card>

      {error ? <p className="note" style={{ color: 'var(--crit)' }}>{error}</p> : null}
    </>
  );
}

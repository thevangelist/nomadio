import { useEffect, useState } from 'react';
import type { Settings } from '@nomadio/shared';
import { api } from '@/lib/api';
import { Card, Row } from '../Primitives';
import Select from '../ui/Select';

export default function SettingsView() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(api('/api/v1/settings'))
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => setError('could not load settings'));
  }, []);

  const patch = async (body: Partial<Settings>) => {
    const res = await fetch(api('/api/v1/settings'), {
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

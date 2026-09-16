import { useEffect, useState } from 'react';
import type { DashboardState } from '@nomadio/shared';
import { clock, duration } from '@/lib/format';
import { useMarkers } from '@/lib/useMarkers';
import { Card } from '../Primitives';
import Checkbox from '../ui/Checkbox';

const MANUAL = [
  { id: 'battery', t: 'Phone charged, power bank connected', d: 'Cable seated, bank switched on' },
  { id: 'mic', t: 'DJI Mic Mini 2 paired, level checked', d: 'No API — verify by ear' },
  { id: 'mount', t: 'GP26 neck mount tight, lens wiped', d: '' },
  { id: 'esim', t: 'Right eSIM active, data on', d: '' },
  { id: 'encoder', t: 'Encoder started on the phone', d: 'No remote start exists from a web page' },
];
const KEY = 'nomadio.checklist';

export default function ControlView({ state }: { state: DashboardState }) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState('');
  const { add, pending, error } = useMarkers();
  const markers = state.markers ?? [];

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setDone(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* private mode */
    }
  }, []);

  const toggle = (id: string) =>
    setDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* private mode */
      }
      return next;
    });

  const ingestOk = state.stream.state === 'LIVE';
  const remaining = MANUAL.filter((i) => !done[i.id]).length + (ingestOk ? 0 : 1);

  const submit = async () => {
    const text = note.trim() || 'marker';
    setNote('');
    await add(text);
  };

  return (
    <>
      <Card title={remaining === 0 ? 'Ready to go live' : `Go live · ${remaining} left`}>
        {MANUAL.map((i) => (
          <label key={i.id} className={`step ${done[i.id] ? 'done' : ''}`}>
            <Checkbox checked={!!done[i.id]} onCheckedChange={() => toggle(i.id)} aria-label={i.t} />
            <span className="body">
              <span className="t">{i.t}</span>
              {i.d ? <span className="d">{i.d}</span> : null}
            </span>
            <span className="tag">manual</span>
          </label>
        ))}
        <div className={`step auto ${ingestOk ? 'done' : ''}`}>
          <span className="auto-mark">
            <i className={`dot ${ingestOk ? 'ok' : 'crit'}`} />
          </span>
          <span className="body">
            <span className="t">Ingest sees the publisher</span>
            <span className="d">
              {ingestOk ? `LIVE via ${state.stream.source}` : `currently ${state.stream.state}`}
            </span>
          </span>
          <span className="tag">auto</span>
        </div>
        <p className="note" style={{ marginTop: 12 }}>
          {remaining === 0
            ? 'Rig is up. Start the broadcast on the platform.'
            : 'The checklist is stored on this device only.'}
        </p>
      </Card>

      <Card title="Markers">
        <div className="btn-row">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="what happened"
            style={{ flex: 1, minWidth: 140 }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit();
            }}
          />
          <button className="btn primary" onClick={() => void submit()} disabled={pending}>
            Mark now
          </button>
        </div>
        {error ? <p className="note crit-text">{error}</p> : null}
        <div style={{ marginTop: 12 }}>
          {markers.length === 0 ? (
            <p className="note">
              One tap writes a timestamp into the session. Use it when something happens worth
              cutting to later.
            </p>
          ) : (
            markers.map((m) => (
              <div key={m.id} className="row">
                <span className="k">
                  {m.note}
                  <span className="sub">{clock(m.at)}</span>
                </span>
                <span className="v">{m.sessionOffsetMs === null ? '—' : duration(m.sessionOffsetMs)}</span>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card title="Scenes">
        <div className="btn-row">
          <button className="btn" disabled>iPhone</button>
          <button className="btn" disabled>GoPro</button>
          <button className="btn" disabled>BRB</button>
          <button className="btn" disabled>Ending</button>
        </div>
        <p className="note" style={{ marginTop: 12 }}>
          Disabled until OBS is connected. V3 adds obs-websocket; the endpoint answers 501 today.
        </p>
      </Card>
    </>
  );
}

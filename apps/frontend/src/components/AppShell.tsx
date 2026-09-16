import { useEffect } from 'react';
import { useUrlParam } from '@/lib/useUrlParam';
import {
  Cog6ToothIcon,
  DevicePhoneMobileIcon,
  PlayIcon,
  SignalIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import Tabs from './ui/Tabs';
import QualityChart from './QualityChart';
import { useHistory } from '@/lib/useHistory';
import { useDashboard } from '@/lib/useDashboard';
import { duration } from '@/lib/format';
import MonitorView from './views/MonitorView';
import ControlView from './views/ControlView';
import NetworkView from './views/NetworkView';
import DevicesView from './views/DevicesView';
import SettingsView from './views/SettingsView';
import SetupView from './views/SetupView';

/** Three targets in the thumb zone. Outdoors you need one glance, not six choices. */
const TABS = [
  { id: 'monitor', label: 'Monitor', Icon: SignalIcon },
  { id: 'control', label: 'Control', Icon: PlayIcon },
  { id: 'rig', label: 'Rig', Icon: DevicePhoneMobileIcon },
] as const;

/** Reached from the app bar: read once during setup, not while walking. */
const ASIDE = [
  { id: 'setup', label: 'Setup', Icon: WrenchScrewdriverIcon },
  { id: 'settings', label: 'Settings', Icon: Cog6ToothIcon },
] as const;

const ALL = [...TABS, ...ASIDE];

type Tab = (typeof ALL)[number]['id'];

export default function AppShell() {
  const { state, connection } = useDashboard();
  const history = useHistory(state);
  const [param, setParam] = useUrlParam('view');
  const tab: Tab = (ALL.find((t) => t.id === param)?.id ?? 'monitor') as Tab;
  const setTab = (id: Tab) => setParam(id === 'monitor' ? null : id);

  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  const connDot = connection === 'live' ? 'ok' : connection === 'down' ? 'crit' : 'warn';

  return (
    <Tabs tabs={TABS} value={tab} onValueChange={(id) => setTab(id as Tab)}>
      <div className="shell">
      <header className="appbar">
        <span className="brand">
          <img src="/logo.svg" alt="" width={20} height={20} />
          NomadIO
          <span className="crumb">{ALL.find((t) => t.id === tab)!.label}</span>
        </span>
        <span className="bar-right">
          <span className="status">
            <i className={`dot ${connDot}`} />
            <span className="mono">{state ? duration(state.session.durationMs) : connection}</span>
          </span>
          {ASIDE.map((a) => (
            <button
              key={a.id}
              className="bar-btn"
              onClick={() => setTab(a.id)}
              aria-label={a.label}
              aria-pressed={tab === a.id}
            >
              <a.Icon className="glyph" aria-hidden />
            </button>
          ))}
        </span>
      </header>

      <main className="view">
        {state ? <QualityChart samples={history} /> : null}
        {state ? <h1 className="view-title">{ALL.find((t) => t.id === tab)!.label}</h1> : null}
        {!state ? (
          <>
            <h1>{connection === 'down' ? 'Backend unreachable' : 'Connecting'}</h1>
            <p className="note">
              {connection === 'down'
                ? 'No telemetry source. The monitor is down, which says nothing about the stream itself.'
                : 'Waiting for the first snapshot.'}
            </p>
          </>
        ) : (
          <>
            {tab === 'monitor' && <MonitorView state={state} />}
            {tab === 'control' && <ControlView state={state} />}
            {tab === 'rig' && (
              <>
                <DevicesView state={state} />
                <NetworkView state={state} />
              </>
            )}
            {tab === 'setup' && <SetupView state={state} />}
            {tab === 'settings' && <SettingsView />}
          </>
        )}
      </main>

      </div>
    </Tabs>
  );
}

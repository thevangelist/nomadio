import { useEffect } from 'react';
import { useUrlParam } from '@/lib/useUrlParam';
import {
  Cog6ToothIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  PlayIcon,
  SignalIcon,
  SparklesIcon,
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

const TABS = [
  { id: 'monitor', label: 'Monitor', Icon: SignalIcon },
  { id: 'control', label: 'Control', Icon: PlayIcon },
  { id: 'network', label: 'Network', Icon: GlobeAltIcon },
  { id: 'devices', label: 'Devices', Icon: DevicePhoneMobileIcon },
  { id: 'setup', label: 'Setup', Icon: SparklesIcon },
  { id: 'settings', label: 'Settings', Icon: Cog6ToothIcon },
] as const;

type Tab = (typeof TABS)[number]['id'];

export default function AppShell() {
  const { state, connection } = useDashboard();
  const history = useHistory(state);
  const [param, setParam] = useUrlParam('view');
  const tab: Tab = (TABS.find((t) => t.id === param)?.id ?? 'monitor') as Tab;
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
          <img src="/logo.svg" alt="" width={13} height={22} />
          NOMADIO
          <span className="crumb">/ {TABS.find((t) => t.id === tab)!.label}</span>
        </span>
        <span className="status">
          <i className={`dot ${connDot}`} />
          <span className="mono">{state ? `${state.stream.state} · ${duration(state.session.durationMs)}` : connection}</span>
        </span>
      </header>

      <main className="view">
        {state ? <QualityChart samples={history} /> : null}
        {state ? <h1 className="view-title">{TABS.find((t) => t.id === tab)!.label}</h1> : null}
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
            {tab === 'network' && <NetworkView state={state} />}
            {tab === 'devices' && <DevicesView state={state} />}
            {tab === 'setup' && <SetupView state={state} />}
            {tab === 'settings' && <SettingsView />}
          </>
        )}
      </main>

      </div>
    </Tabs>
  );
}

import { useEffect, useRef, useState } from 'react';
import type { DashboardState, WsMessage } from '@nomadio/shared';
import { fetchState, wsUrl } from './api';

export type Connection = 'connecting' | 'live' | 'polling' | 'down';

/**
 * WebSocket first, REST polling as a fallback: the dashboard usually rides the same bad link
 * it is monitoring, so it must degrade instead of freezing on a stale frame.
 */
export function useDashboard() {
  const [state, setState] = useState<DashboardState | null>(null);
  const [connection, setConnection] = useState<Connection>('connecting');
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let disposed = false;
    let retry: ReturnType<typeof setTimeout>;
    let poll: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (poll || disposed) return;
      const run = () =>
        fetchState()
          .then((s) => {
            if (disposed) return;
            setState(s);
            setConnection((c) => (c === 'live' ? c : 'polling'));
          })
          .catch(() => !disposed && setConnection('down'));
      run();
      poll = setInterval(run, 3000);
    };

    const stopPolling = () => {
      if (poll) clearInterval(poll);
      poll = null;
    };

    const connect = () => {
      if (disposed) return;
      const socket = new WebSocket(wsUrl());
      socketRef.current = socket;

      socket.onopen = () => {
        stopPolling();
        setConnection('live');
      };
      socket.onmessage = (ev) => {
        const msg = JSON.parse(ev.data as string) as WsMessage;
        if (msg.type === 'state') setState(msg.payload);
      };
      socket.onclose = () => {
        if (disposed) return;
        setConnection('polling');
        startPolling();
        retry = setTimeout(connect, 2000);
      };
      socket.onerror = () => socket.close();
    };

    startPolling();
    connect();

    return () => {
      disposed = true;
      clearTimeout(retry);
      stopPolling();
      socketRef.current?.close();
    };
  }, []);

  return { state, connection };
}

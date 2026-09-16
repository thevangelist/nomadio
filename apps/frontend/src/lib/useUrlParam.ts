import { useCallback, useSyncExternalStore } from 'react';

const subscribe = (onChange: () => void) => {
  window.addEventListener('popstate', onChange);
  return () => window.removeEventListener('popstate', onChange);
};

/**
 * One URL search parameter as state. The view belongs in the URL so a link
 * reopens where you were; replaceState, because switching view is not navigation.
 */
export function useUrlParam(param: string): [string | null, (value: string | null) => void] {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => '',
  );

  const set = useCallback(
    (value: string | null) => {
      const next = new URLSearchParams(window.location.search);
      if (value === null) next.delete(param);
      else next.set(param, value);
      const qs = next.toString();
      window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
      window.dispatchEvent(new PopStateEvent('popstate'));
    },
    [param],
  );

  return [new URLSearchParams(search).get(param), set];
}

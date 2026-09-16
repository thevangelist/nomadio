import { useCallback, useState } from 'react';
import { apiFetch } from './api';

export function useMarkers() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = useCallback(async (note: string) => {
    setPending(true);
    setError(null);
    try {
      const res = await apiFetch('/api/v1/markers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      if (!res.ok) throw new Error(`marker failed (${res.status})`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }, []);

  return { add, pending, error };
}

import { useEffect, useRef, useState } from 'react';
import type { DashboardState } from '@nomadio/shared';

export type Sample = { t: number; bitrateKbps: number | null; live: boolean };

const CAPACITY = 180; // ~3 minutes at 1 Hz

/**
 * Client-side ring buffer. The backend holds no history in V1, and three minutes of shape is
 * what tells you whether a dip is a blip or a trend.
 */
export function useHistory(state: DashboardState | null): Sample[] {
  const [samples, setSamples] = useState<Sample[]>([]);
  const lastAt = useRef(0);

  useEffect(() => {
    if (!state || state.stream.observedAt === lastAt.current) return;
    lastAt.current = state.stream.observedAt;
    setSamples((prev) =>
      [...prev, { t: state.stream.observedAt, bitrateKbps: state.stream.bitrateKbps, live: state.stream.state === 'LIVE' }].slice(
        -CAPACITY,
      ),
    );
  }, [state]);

  return samples;
}

import type { NetworkSnapshot, StreamSnapshot } from '@nomadio/shared';
import type { NetworkProvider } from '../types.js';

/**
 * V1 has no bonding agent, so the only honest network view is "one uplink, inferred from the
 * stream we are receiving". V2 replaces this with SpeedifyNetworkProvider without touching the
 * rest of the system.
 */
export class SingleLinkNetworkProvider implements NetworkProvider {
  readonly id = 'single-link';
  constructor(private readonly latest: () => StreamSnapshot | null) {}

  async poll(): Promise<NetworkSnapshot> {
    const s = this.latest();
    const up = s ? s.state === 'LIVE' : false;
    return {
      mode: 'single',
      activeLinkId: 'A',
      links: [
        {
          id: 'A',
          label: 'Phone cellular (A)',
          state: s === null ? 'UNKNOWN' : up ? 'UP' : 'DOWN',
          active: true,
          latencyMs: s?.latencyMs ?? null,
          packetLossPct: s?.packetLossPct ?? null,
          uploadKbps: s?.uploadKbps ?? null,
        },
      ],
      source: this.id,
      observedAt: Date.now(),
    };
  }
}

export class NoNetworkProvider implements NetworkProvider {
  readonly id = 'none';
  async poll(): Promise<NetworkSnapshot> {
    return { mode: 'unknown', links: [], activeLinkId: null, source: this.id, observedAt: Date.now() };
  }
}

import type { NetworkSnapshot, StreamSnapshot } from '@nomadio/shared';

export interface StreamProvider {
  readonly id: string;
  poll(): Promise<StreamSnapshot>;
}

export interface NetworkProvider {
  readonly id: string;
  poll(): Promise<NetworkSnapshot>;
}

/** V3 seams. Declared now so later versions add an implementation, not an abstraction. */
export interface CameraProvider {
  readonly id: string;
  list(): Promise<Array<{ id: string; label: string; online: boolean }>>;
}

export interface OverlayProvider {
  readonly id: string;
  getScenes(): Promise<Array<{ id: string; name: string; active: boolean }>>;
  setScene(id: string): Promise<void>;
}

export const offlineStream = (source: string): StreamSnapshot => ({
  state: 'OFFLINE',
  bitrateKbps: null,
  fps: null,
  droppedFrames: null,
  uploadKbps: null,
  latencyMs: null,
  packetLossPct: null,
  publisherSince: null,
  source,
  observedAt: Date.now(),
});

export const unknownStream = (source: string): StreamSnapshot => ({
  ...offlineStream(source),
  state: 'UNKNOWN',
});

import type { Marker, StreamState } from '@nomadio/shared';
import { randomUUID } from 'node:crypto';

const MAX = 200;

/** Timestamps the operator drops during a stream. The seed for clip extraction later. */
export class MarkerLog {
  private markers: Marker[] = [];

  add(note: string, streamState: StreamState, sessionStartedAt: number | null, now = Date.now()): Marker {
    const marker: Marker = {
      id: randomUUID(),
      at: now,
      sessionOffsetMs: sessionStartedAt === null ? null : now - sessionStartedAt,
      note: note.slice(0, 200),
      streamState,
    };
    this.markers.unshift(marker);
    if (this.markers.length > MAX) this.markers.pop();
    return marker;
  }

  list(limit = 50): Marker[] {
    return this.markers.slice(0, limit);
  }
}

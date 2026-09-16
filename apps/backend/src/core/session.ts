import type { Outage, SessionState, StreamSnapshot } from '@nomadio/shared';
import { randomUUID } from 'node:crypto';

const MAX_OUTAGES = 50;

/**
 * Derives session facts from the snapshot stream. CONNECTING counts as part of an outage: from
 * the viewer's side a reconnecting stream is still a dead stream.
 */
export class SessionTracker {
  private sessionId: string | null = null;
  private startedAt: number | null = null;
  private lastAt: number | null = null;
  private estimatedBytes = 0;
  private outages: Outage[] = [];

  update(s: StreamSnapshot, now = Date.now()): void {
    const live = s.state === 'LIVE';

    if (live && this.sessionId === null) {
      this.sessionId = randomUUID();
      this.startedAt = now;
      this.estimatedBytes = 0;
      this.outages = [];
    }

    if (this.sessionId !== null) {
      if (live && this.lastAt !== null && s.bitrateKbps !== null) {
        const seconds = Math.min((now - this.lastAt) / 1000, 10);
        this.estimatedBytes += (s.bitrateKbps * 1000 * seconds) / 8;
      }
      const open = this.openOutage();
      if (!live && !open) {
        this.outages.push({ startedAt: now, endedAt: null, durationMs: null });
        if (this.outages.length > MAX_OUTAGES) this.outages.shift();
      } else if (live && open) {
        open.endedAt = now;
        open.durationMs = now - open.startedAt;
      }
    }

    this.lastAt = now;
  }

  /** Called when the publisher has been gone long enough that this is a new session next time. */
  endSession(): void {
    this.sessionId = null;
    this.startedAt = null;
    this.lastAt = null;
  }

  private openOutage(): Outage | undefined {
    const last = this.outages.at(-1);
    return last && last.endedAt === null ? last : undefined;
  }

  state(now = Date.now()): SessionState {
    return {
      sessionId: this.sessionId,
      startedAt: this.startedAt,
      durationMs: this.startedAt === null ? 0 : now - this.startedAt,
      estimatedBytes: Math.round(this.estimatedBytes),
      outages: [...this.outages].reverse(),
    };
  }
}

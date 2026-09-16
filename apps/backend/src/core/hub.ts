import type { DashboardState, WsMessage } from '@nomadio/shared';

type Client = { send(data: string): void };

/** Caches the last state so a client that reconnects on a bad link gets a frame immediately. */
export class Hub {
  private clients = new Set<Client>();
  private last: DashboardState | null = null;

  add(client: Client): void {
    this.clients.add(client);
    if (this.last) this.sendTo(client, { type: 'state', payload: this.last });
  }

  remove(client: Client): void {
    this.clients.delete(client);
  }

  publish(state: DashboardState): void {
    this.last = state;
    const msg: WsMessage = { type: 'state', payload: state };
    for (const c of this.clients) this.sendTo(c, msg);
  }

  latest(): DashboardState | null {
    return this.last;
  }

  get size(): number {
    return this.clients.size;
  }

  private sendTo(client: Client, msg: WsMessage): void {
    try {
      client.send(JSON.stringify(msg));
    } catch {
      this.clients.delete(client);
    }
  }
}

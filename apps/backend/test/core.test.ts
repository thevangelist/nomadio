import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, type DashboardState } from '@nomadio/shared';
import { DeviceRegistry } from '../src/core/devices.js';
import { Hub } from '../src/core/hub.js';
import { MarkerLog } from '../src/core/markers.js';
import { SettingsStore } from '../src/core/settings.js';

const state = { serverTime: 1 } as DashboardState;

describe('Hub', () => {
  it('hands a newly connected client the last state immediately', () => {
    const hub = new Hub();
    hub.publish(state);

    const client = { send: vi.fn() };
    hub.add(client);

    expect(client.send).toHaveBeenCalledWith(JSON.stringify({ type: 'state', payload: state }));
  });

  it('sends nothing to a client that connects before the first tick', () => {
    const hub = new Hub();
    const client = { send: vi.fn() };
    hub.add(client);

    expect(client.send).not.toHaveBeenCalled();
    expect(hub.latest()).toBeNull();
  });

  it('drops a client whose socket throws, so one dead phone cannot break the rest', () => {
    const hub = new Hub();
    const broken = {
      send: vi.fn(() => {
        throw new Error('EPIPE');
      }),
    };
    const healthy = { send: vi.fn() };
    hub.add(broken);
    hub.add(healthy);

    hub.publish(state);

    expect(hub.size).toBe(1);
    expect(healthy.send).toHaveBeenCalled();
  });

  it('stops sending after remove', () => {
    const hub = new Hub();
    const client = { send: vi.fn() };
    hub.add(client);
    hub.remove(client);
    hub.publish(state);

    expect(client.send).not.toHaveBeenCalled();
  });
});

describe('MarkerLog', () => {
  it('records the offset into the session, not just the wall clock', () => {
    const log = new MarkerLog();
    const marker = log.add('dog', 'LIVE', 1_000_000, 1_090_000);

    expect(marker).toMatchObject({ note: 'dog', streamState: 'LIVE', sessionOffsetMs: 90_000 });
  });

  it('leaves the offset unknown when no session is running', () => {
    expect(new MarkerLog().add('note', 'OFFLINE', null).sessionOffsetMs).toBeNull();
  });

  it('returns newest first and truncates an overlong note', () => {
    const log = new MarkerLog();
    log.add('first', 'LIVE', null);
    log.add('x'.repeat(500), 'LIVE', null);

    const [newest, oldest] = log.list();
    expect(newest?.note).toHaveLength(200);
    expect(oldest?.note).toBe('first');
  });

  it('keeps the log bounded', () => {
    const log = new MarkerLog();
    for (let i = 0; i < 250; i++) log.add(`m${i}`, 'LIVE', null);

    expect(log.list(1000)).toHaveLength(200);
    expect(log.list()[0]?.note).toBe('m249');
  });
});

describe('DeviceRegistry', () => {
  it('marks a device stale once its telemetry stops', () => {
    const registry = new DeviceRegistry(120_000);
    registry.ingest({ deviceId: 'iphone', batteryPct: 50 }, 1000);

    expect(registry.list(60_000)[0]?.stale).toBe(false);
    expect(registry.list(200_000)[0]?.stale).toBe(true);
  });

  it('replaces a device rather than duplicating it', () => {
    const registry = new DeviceRegistry(120_000);
    registry.ingest({ deviceId: 'iphone', batteryPct: 50 }, 1000);
    registry.ingest({ deviceId: 'iphone', batteryPct: 40 }, 2000);

    expect(registry.list(2000)).toHaveLength(1);
    expect(registry.list(2000)[0]?.batteryPct).toBe(40);
  });

  it('evicts the oldest device past the cap, so a typo cannot fill memory', () => {
    const registry = new DeviceRegistry(120_000);
    for (let i = 0; i < 12; i++) registry.ingest({ deviceId: `device-${i}` }, 1000 + i);

    const ids = registry.list(2000).map((d) => d.deviceId);
    expect(ids).toHaveLength(10);
    expect(ids).not.toContain('device-0');
    expect(ids).toContain('device-11');
  });
});

describe('SettingsStore', () => {
  it('starts with location withheld and automation off', () => {
    expect(new SettingsStore().get()).toEqual(DEFAULT_SETTINGS);
  });

  it('merges a partial update', () => {
    const store = new SettingsStore();
    const next = store.update({ thresholds: { ...DEFAULT_SETTINGS.thresholds, minBitrateKbps: 1500 } });

    expect(next.thresholds.minBitrateKbps).toBe(1500);
    expect(next.privacy.exposeLocation).toBe('off');
  });

  it('refuses the unimplemented quality ladder and keeps the old settings', () => {
    const store = new SettingsStore();
    expect(() => store.update({ autoQualityLadder: { enabled: true } })).toThrow(/not implemented/);
    expect(store.get().autoQualityLadder.enabled).toBe(false);
  });

  it('rejects a malformed patch', () => {
    expect(() => new SettingsStore().update({ privacy: { exposeLocation: 'everywhere' } })).toThrow();
  });
});

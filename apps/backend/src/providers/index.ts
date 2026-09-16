import type { StreamSnapshot } from '@nomadio/shared';
import type { Config } from '../config.js';
import { MockStreamProvider } from './stream/mock.js';
import { NginxRtmpStreamProvider } from './stream/nginxRtmp.js';
import { SrtStreamProvider } from './stream/srt.js';
import { NoNetworkProvider, SingleLinkNetworkProvider } from './network/single.js';
import type { NetworkProvider, StreamProvider } from './types.js';

export function createStreamProvider(cfg: Config): StreamProvider {
  switch (cfg.STREAM_PROVIDER) {
    case 'srt':
      return new SrtStreamProvider(cfg.SRT_STATS_URL!, cfg.STREAM_KEY);
    case 'nginx-rtmp':
      return new NginxRtmpStreamProvider(cfg.NGINX_RTMP_STATS_URL!, cfg.STREAM_APP, cfg.STREAM_KEY);
    default:
      return new MockStreamProvider();
  }
}

export function createNetworkProvider(cfg: Config, latest: () => StreamSnapshot | null): NetworkProvider {
  return cfg.NETWORK_PROVIDER === 'none' ? new NoNetworkProvider() : new SingleLinkNetworkProvider(latest);
}

export * from './types.js';

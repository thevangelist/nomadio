import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Config } from './config.js';

const PUBLIC_PATHS = new Set(['/healthz', '/readyz']);

/**
 * One shared token for everything that is not a health check. The dashboard is a public static
 * page and the API is reachable through a tunnel, so "inside my LAN" stops being the boundary.
 * Accepted as a bearer header, or as ?token= for the WebSocket, which cannot carry headers.
 */
export function createAuthHook(cfg: Config) {
  return async function requireToken(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (!cfg.API_TOKEN || PUBLIC_PATHS.has(req.url.split('?')[0] ?? '')) return;

    const header = req.headers.authorization;
    const bearer = header?.startsWith('Bearer ') ? header.slice(7) : null;
    const query = typeof req.query === 'object' && req.query !== null ? (req.query as { token?: string }).token : undefined;

    if (bearer === cfg.API_TOKEN || query === cfg.API_TOKEN) return;
    await reply.code(401).send({ error: 'unauthorized' });
  };
}

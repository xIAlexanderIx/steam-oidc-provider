// Types
import type { Context, Next } from 'hono';
import { getConnInfo } from 'hono/bun';

// Config
import { config } from '../config';

/**
 * Middleware to extract request context
 */
export async function requestContext(pCtx: Context, pNext: Next): Promise<void> {
    let protocol = pCtx.req.url.startsWith('https') ? 'https' : 'http';

    let clientIp = 'unknown';

    if (config.trustedProxy) {
        const forwardedProto = pCtx.req.header('x-forwarded-proto');

        if (forwardedProto === 'https' || forwardedProto === 'http') {
            protocol = forwardedProto;
        }

        const forwardedFor = pCtx.req.header('x-forwarded-for');

        if (forwardedFor) {
            clientIp = forwardedFor.split(',')[0].trim();
        } else {
            clientIp = pCtx.req.header('x-real-ip') ?? 'unknown';
        }
    } else if (process.env.NODE_ENV !== 'test') {
        // Get IP from socket connection when not behind a proxy
        const connInfo = getConnInfo(pCtx);

        clientIp = connInfo.remote.address ?? 'unknown';
    }

    pCtx.set('protocol', protocol);
    pCtx.set('clientIp', clientIp);

    await pNext();
}

import { Hono } from 'hono';

const health = new Hono();

const HEALTH_CACHE_MS = 30000; // 30 second cache
const STEAM_TIMEOUT_MS = 2000; // 2 second timeout

let lastSteamCheck = { status: 'unknown', timestamp: 0 };

/**
 * Health check endpoint
 * Returns service health status
 */
health.get('/health', async (pCtx) => {
    const now = Date.now();

    // Use cached result if fresh
    if (now - lastSteamCheck.timestamp < HEALTH_CACHE_MS) {
        const status = lastSteamCheck.status === 'reachable' ? 'healthy' : 'degraded';

        const statusCode = status === 'healthy' ? 200 : 503;

        const response = {
            status,
            steam: lastSteamCheck.status,
            timestamp: new Date().toISOString(),
            cached: true,
        };

        return pCtx.json(response, statusCode);
    }

    let steamStatus = 'unknown';

    try {
        const response = await fetch('https://steamcommunity.com/openid', {
            method: 'HEAD',
            signal: AbortSignal.timeout(STEAM_TIMEOUT_MS),
        });

        steamStatus = response.ok ? 'reachable' : 'unreachable';
    } catch {
        steamStatus = 'unreachable';
    }

    lastSteamCheck = { status: steamStatus, timestamp: now };

    const status = steamStatus === 'reachable' ? 'healthy' : 'degraded';

    const statusCode = status === 'healthy' ? 200 : 503;

    const response = {
        status,
        steam: steamStatus,
        timestamp: new Date().toISOString(),
        cached: false,
    };

    return pCtx.json(response, statusCode);
});

export { health };

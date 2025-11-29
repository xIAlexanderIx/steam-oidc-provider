import { Hono } from 'hono';

// Services
import { getSteamProfile } from '../services/steam';
import { getStorage } from '../services/storage';

// Middlewares
import { OidcError } from '../middleware/error-handler';

const userinfo = new Hono();

/**
 * Userinfo endpoint
 * Returns user profile for a valid access token
 */
userinfo.get('/userinfo', async (pCtx) => {
    const authHeader = pCtx.req.header('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
        throw new OidcError('invalid_token', 'Missing or invalid authorization header', 401);
    }

    const token = authHeader.slice(7);

    const storage = getStorage();

    const tokenData = await storage.getAccessToken(token);

    if (!tokenData) {
        throw new OidcError('invalid_token', 'Invalid or expired access token', 401);
    }

    // Fetch Steam profile
    const profile = await getSteamProfile(tokenData.steamId);

    if (!profile) {
        throw new OidcError('server_error', 'Failed to fetch Steam profile', 500);
    }

    return pCtx.json({
        sub: profile.steamid,
        name: profile.personaname,
        picture: profile.avatarfull,
        preferred_username: profile.personaname,
    });
});

export { userinfo };

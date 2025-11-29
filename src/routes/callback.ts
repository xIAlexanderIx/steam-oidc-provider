import { Hono } from 'hono';
import { getCookie, deleteCookie } from 'hono/cookie';

// Services
import { openIdService } from '../services/openid';
import { getStorage } from '../services/storage';

// Middlewares
import { OidcError } from '../middleware/error-handler';

// Utils
import { buildErrorRedirect } from '../utils/errors';
import { generateCode } from '../utils/crypto';
import { verifyData } from '../utils/cookie-signature';
import { getRequestProtocol } from '../utils/misc';

// Config
import { config } from '../config';

// Types
import type { AuthState, AuthorizationCode } from '../types';

// Validation
import { AuthStateSchema } from '../schemas';

const callback = new Hono();

/**
 * Callback endpoint
 * Handles Steam OpenID response and generates authorization code
 */
callback.get('/callback', async (pCtx) => {
    const storedStateJson = getCookie(pCtx, 'oidc_state');

    if (!storedStateJson) {
        throw new OidcError('invalid_request', 'Missing state cookie. Session may have expired.', 400);
    }

    deleteCookie(pCtx, 'oidc_state', { path: '/' });

    // Verify cookie signature
    const verifiedData = verifyData(storedStateJson, config.jwtSecret);

    if (!verifiedData) {
        throw new OidcError('invalid_request', 'Invalid or tampered state cookie', 400);
    }

    let storedState: AuthState;

    try {
        const rawState = JSON.parse(verifiedData);

        const parsed = AuthStateSchema.safeParse(rawState);

        if (!parsed.success) {
            throw new OidcError('invalid_request', 'Invalid state cookie data', 400);
        }

        storedState = parsed.data;
    } catch (pError) {
        if (pError instanceof OidcError) throw pError;

        throw new OidcError('invalid_request', 'Invalid state cookie format', 400);
    }

    if (!config.redirectUris.includes(storedState.redirectUri)) {
        throw new OidcError('invalid_request', 'Invalid redirect_uri', 400);
    }

    const protocol = getRequestProtocol(pCtx);
    const host = pCtx.req.header('host') ?? '';
    const url = pCtx.req.url;

    const fullUrl = url.startsWith('http')
        ? url
        : `${protocol}://${host}${url}`;

    let steamId: string | null;

    try {
        steamId = await openIdService.verifyAssertion(fullUrl);
    } catch (pError) {
        console.error('OpenID verification error:', pError);

        const redirect = buildErrorRedirect(storedState.redirectUri, 'Steam authentication failed', storedState.state);

        return pCtx.redirect(redirect);
    }

    if (!steamId) {
        const redirect = buildErrorRedirect(storedState.redirectUri, 'Steam authentication was denied or failed', storedState.state);

        return pCtx.redirect(redirect);
    }

    // Generate authorization code
    const code = generateCode(32);

    const now = Date.now();

    const authCode: AuthorizationCode = {
        code,
        steamId,
        clientId: storedState.clientId,
        redirectUri: storedState.redirectUri,
        nonce: storedState.nonce,
        codeChallenge: storedState.codeChallenge,
        codeChallengeMethod: storedState.codeChallengeMethod,
        createdAt: now,
        expiresAt: now + config.authCodeTtl * 1000,
    };

    // Store the authorization code
    const storage = getStorage();

    await storage.saveAuthCode(authCode);

    // Redirect back to client with code
    const successUrl = new URL(storedState.redirectUri);

    successUrl.searchParams.set('code', code);

    if (storedState.state) {
        successUrl.searchParams.set('state', storedState.state);
    }

    return pCtx.redirect(successUrl.toString());
});

export { callback };

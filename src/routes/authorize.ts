import { Hono } from 'hono';
import { setCookie } from 'hono/cookie';

// Services
import { openIdService } from '../services/openid';

// Middlewares
import { OidcError } from '../middleware/error-handler';

// Utils
import { signData } from '../utils/cookie-signature';
import { isSecureRequest } from '../utils/misc';

// Config
import { config } from '../config';

// Types
import type { AuthState } from '../types';

const authorize = new Hono();

/**
 * Authorization endpoint
 * Validates parameters and redirects to Steam OpenID
 */
authorize.get('/authorize', async (pCtx) => {
    const clientId = pCtx.req.query('client_id');
    const redirectUri = pCtx.req.query('redirect_uri');
    const responseType = pCtx.req.query('response_type');

    const state = pCtx.req.query('state');
    const nonce = pCtx.req.query('nonce');

    const codeChallenge = pCtx.req.query('code_challenge');
    const codeChallengeMethod = pCtx.req.query('code_challenge_method');

    // Validate required parameters
    if (!clientId) {
        throw new OidcError('invalid_request', 'Missing client_id parameter', 400);
    }

    if (!redirectUri) {
        throw new OidcError('invalid_request', 'Missing redirect_uri parameter', 400);
    }

    if (!responseType) {
        throw new OidcError('invalid_request', 'Missing response_type parameter', 400);
    }

    // Validate client_id
    if (clientId !== config.clientId) {
        throw new OidcError('invalid_client', 'Unknown client_id', 401);
    }

    // Validate redirect_uri against allowed list
    if (!config.redirectUris.includes(redirectUri)) {
        throw new OidcError('invalid_request', 'Invalid redirect_uri', 400);
    }

    // Validate response_type
    if (responseType !== 'code') {
        throw new OidcError('unsupported_response_type', 'Only code flow is supported', 400);
    }

    // Validate PKCE parameters if provided
    if (codeChallenge) {
        if (!codeChallengeMethod) {
            throw new OidcError('invalid_request', 'code_challenge_method required when code_challenge provided', 400);
        }

        if (codeChallengeMethod !== 'S256') {
            throw new OidcError('invalid_request', 'Only S256 code_challenge_method is supported', 400);
        }
    }

    // Store state in secure cookie for callback verification
    const authState: AuthState = {
        state,
        nonce,
        redirectUri,
        clientId,
        codeChallenge,
        codeChallengeMethod,
    };

    const signedState = signData(JSON.stringify(authState), config.jwtSecret);

    setCookie(pCtx, 'oidc_state', signedState, {
        path: '/',
        httpOnly: true,
        secure: isSecureRequest(pCtx),
        sameSite: 'Lax', // Required for OAuth - 'Strict' blocks cookies on cross-site redirects from Steam
        maxAge: 600, // 10 minutes
    });

    // Redirect to Steam OpenID
    const authUrl = await openIdService.getAuthUrl(state);

    return pCtx.redirect(authUrl);
});

export { authorize };

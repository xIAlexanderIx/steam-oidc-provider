import { Hono } from 'hono';
import { createHash } from 'crypto';

// Services
import { getSteamProfile } from '../services/steam';
import { getStorage } from '../services/storage';
import { jwtService } from '../services/jwt';

// Middleware
import { OidcError } from '../middleware/error-handler';

// Utils
import { safeCompare } from '../utils/crypto';

// Config
import { config } from '../config';

// Validation
import { TokenRequestSchema } from '../schemas';

// Types
import type { TokenResponse, IdTokenClaims, AccessToken } from '../types';

const token = new Hono();

/**
 * Token endpoint
 * Exchanges authorization code for access_token and id_token
 */
token.post('/token', async (pCtx) => {
    const contentType = pCtx.req.header('content-type') ?? '';

    let rawBody: Record<string, unknown>;

    if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await pCtx.req.parseBody();

        rawBody = Object.fromEntries(Object.entries(formData).map(([k, v]) => [k, String(v)]));
    } else {
        rawBody = await pCtx.req.json();
    }

    const parsed = TokenRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
        throw new OidcError('invalid_request', 'Invalid request parameters', 400);
    }

    const { grant_type, code, redirect_uri, client_id, client_secret, code_verifier } = parsed.data;

    const authHeader = pCtx.req.header('authorization');

    let authClientId = client_id;
    let authClientSecret = client_secret;

    if (authHeader?.startsWith('Basic ')) {
        try {
            const decoded = atob(authHeader.slice(6));
            const [id, secret] = decoded.split(':');

            authClientId = id;
            authClientSecret = secret;
        } catch {
            throw new OidcError('invalid_client', 'Invalid Basic authentication header', 401);
        }
    }

    if (grant_type !== 'authorization_code') {
        throw new OidcError('unsupported_grant_type', 'Only authorization_code grant is supported', 400);
    }

    if (!safeCompare(authClientId ?? '', config.clientId)) {
        throw new OidcError('invalid_client', 'Invalid credentials', 401);
    }

    if (!safeCompare(authClientSecret ?? '', config.clientSecret)) {
        throw new OidcError('invalid_client', 'Invalid credentials', 401);
    }

    if (!code) {
        throw new OidcError('invalid_request', 'Missing code parameter', 400);
    }

    const storage = getStorage();

    const authCode = await storage.consumeAuthCode(code);

    if (!authCode) {
        throw new OidcError('invalid_grant', 'Invalid, expired, or already used authorization code', 400);
    }

    // Validate redirect_uri matches
    if (redirect_uri && redirect_uri !== authCode.redirectUri) {
        throw new OidcError('invalid_grant', 'redirect_uri mismatch', 400);
    }

    // Verify PKCE if code_challenge was provided during authorization
    if (authCode.codeChallenge) {
        if (!code_verifier) {
            throw new OidcError('invalid_grant', 'code_verifier required', 400);
        }

        const computedChallenge = createHash('sha256')
            .update(code_verifier)
            .digest('base64url');

        if (computedChallenge !== authCode.codeChallenge) {
            throw new OidcError('invalid_grant', 'Invalid code_verifier', 400);
        }
    }

    const profile = await getSteamProfile(authCode.steamId);

    if (!profile) {
        throw new OidcError('server_error', 'Failed to fetch Steam profile', 500);
    }

    const now = Math.floor(Date.now() / 1000);

    const expiresIn = config.accessTokenTtl;

    const idTokenClaims: IdTokenClaims = {
        iss: config.issuerUrl,
        sub: authCode.steamId,
        aud: authCode.clientId,
        exp: now + expiresIn,
        iat: now,
        name: profile.personaname,
        picture: profile.avatarfull,
        preferred_username: profile.personaname,
    };

    if (authCode.nonce) {
        idTokenClaims.nonce = authCode.nonce;
    }

    const accessToken = await jwtService.signAccessToken(authCode.steamId);

    const idToken = await jwtService.signIdToken(idTokenClaims);

    const tokenData: AccessToken = {
        token: accessToken,
        steamId: authCode.steamId,
        createdAt: now * 1000,
        expiresAt: (now + expiresIn) * 1000,
    };

    await storage.saveAccessToken(tokenData);

    const response: TokenResponse = {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: expiresIn,
        id_token: idToken,
    };

    return pCtx.json(response);
});

export { token };

import { Hono } from 'hono';

// Config
import { config } from '../config';

const discovery = new Hono();

/**
 * OpenID Connect Discovery endpoint
 * Returns the provider configuration
 */
discovery.get('/.well-known/openid-configuration', (pCtx) => {
    const issuer = config.issuerUrl;

    return pCtx.json({
        issuer,
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`,
        userinfo_endpoint: `${issuer}/userinfo`,
        jwks_uri: `${issuer}/jwks`,
        response_types_supported: ['code'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['EdDSA'],
        scopes_supported: ['openid', 'profile'],
        token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
        claims_supported: ['sub', 'name', 'picture', 'preferred_username'],
        grant_types_supported: ['authorization_code'],
        code_challenge_methods_supported: ['S256'],
    });
});

export { discovery };

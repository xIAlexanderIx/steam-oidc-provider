import { describe, it, expect, beforeAll } from 'bun:test';
import { jwtService } from '../../src/services/jwt';
import { createApp } from '../../src/app';

describe('/.well-known/openid-configuration', () => {
    let app: ReturnType<typeof createApp>;

    beforeAll(async () => {
        await jwtService.initialize();

        app = createApp();
    });

    it('returns OIDC discovery document', async () => {
        const res = await app.request('/.well-known/openid-configuration');

        expect(res.status).toBe(200);

        const body = await res.json();

        // Required OIDC discovery fields
        expect(body.issuer).toBe('https://test.example.com');
        expect(body.authorization_endpoint).toBe('https://test.example.com/authorize');
        expect(body.token_endpoint).toBe('https://test.example.com/token');
        expect(body.userinfo_endpoint).toBe('https://test.example.com/userinfo');
        expect(body.jwks_uri).toBe('https://test.example.com/jwks');
    });

    it('includes supported response types and scopes', async () => {
        const res = await app.request('/.well-known/openid-configuration');

        const body = await res.json();

        expect(body.response_types_supported).toContain('code');
        expect(body.scopes_supported).toContain('openid');
        expect(body.scopes_supported).toContain('profile');
        expect(body.id_token_signing_alg_values_supported).toContain('EdDSA');
    });
});

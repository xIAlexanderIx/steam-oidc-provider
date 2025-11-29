import { describe, it, expect, beforeAll } from 'bun:test';
import { jwtService } from '../../src/services/jwt';

describe('JwtService', () => {
    beforeAll(async () => {
        await jwtService.initialize();
    });

    it('produces consistent keys from the same secret', async () => {
        const jwks1 = jwtService.getJwks();
        const jwks2 = jwtService.getJwks();

        expect(jwks1.keys[0].x).toBe(jwks2.keys[0].x);
    });

    it('signs valid access tokens', async () => {
        const token = await jwtService.signAccessToken('76561198042789158');

        expect(typeof token).toBe('string');
        expect(token.split('.')).toHaveLength(3); // JWT has 3 parts

        // Decode header to verify algorithm
        const [header] = token.split('.');
        const decoded = JSON.parse(atob(header));
        expect(decoded.alg).toBe('EdDSA');
        expect(decoded.typ).toBe('JWT');
    });

    it('signs valid ID tokens', async () => {
        const claims = {
            iss: 'https://test.example.com',
            sub: '76561198042789158',
            aud: 'test-client',
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000),
            name: 'TestUser',
            picture: 'https://example.com/avatar.jpg',
            preferred_username: 'TestUser',
        };

        const token = await jwtService.signIdToken(claims);

        expect(typeof token).toBe('string');
        expect(token.split('.')).toHaveLength(3);

        // Decode payload to verify claims
        const [, payload] = token.split('.');
        const decoded = JSON.parse(atob(payload));
        expect(decoded.sub).toBe('76561198042789158');
        expect(decoded.name).toBe('TestUser');
    });
});

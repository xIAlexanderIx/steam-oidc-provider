import { describe, it, expect, beforeAll } from 'bun:test';
import { jwtService } from '../../src/services/jwt';
import { createApp } from '../../src/app';

describe('/jwks', () => {
    let app: ReturnType<typeof createApp>;

    beforeAll(async () => {
        await jwtService.initialize();

        app = createApp();
    });

    it('returns JWK set with Ed25519 public key', async () => {
        const res = await app.request('/jwks');

        expect(res.status).toBe(200);

        const body = await res.json();

        expect(body).toHaveProperty('keys');
        expect(Array.isArray(body.keys)).toBe(true);
        expect(body.keys.length).toBeGreaterThan(0);

        const key = body.keys[0];

        expect(key.kty).toBe('OKP');
        expect(key.crv).toBe('Ed25519');
        expect(key.use).toBe('sig');
        expect(key.alg).toBe('EdDSA');
        expect(key).toHaveProperty('x'); // Public key
        expect(key).not.toHaveProperty('d'); // Private key should NOT be exposed
    });
});

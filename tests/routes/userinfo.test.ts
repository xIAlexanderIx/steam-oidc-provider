import { describe, it, expect, beforeAll } from 'bun:test';
import { jwtService } from '../../src/services/jwt';
import { createApp } from '../../src/app';

describe('/userinfo', () => {
    let app: ReturnType<typeof createApp>;

    beforeAll(async () => {
        await jwtService.initialize();

        app = createApp();
    });

    it('returns 401 without authorization header', async () => {
        const res = await app.request('/userinfo');

        expect(res.status).toBe(401);

        const body = await res.json();

        expect(body.error).toBe('invalid_token');
    });

    it('returns 401 with invalid token format', async () => {
        const res = await app.request('/userinfo', {
            headers: { Authorization: 'Bearer invalid-token' },
        });

        expect(res.status).toBe(401);

        const body = await res.json();

        expect(body.error).toBe('invalid_token');
    });

    it('returns 401 with non-Bearer auth', async () => {
        const res = await app.request('/userinfo', {
            headers: { Authorization: 'Basic dGVzdDp0ZXN0' },
        });

        expect(res.status).toBe(401);

        const body = await res.json();

        expect(body.error).toBe('invalid_token');
    });
});

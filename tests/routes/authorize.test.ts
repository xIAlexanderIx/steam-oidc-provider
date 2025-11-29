import { describe, it, expect, beforeAll } from 'bun:test';
import { jwtService } from '../../src/services/jwt';
import { createApp } from '../../src/app';

describe('/authorize', () => {
    let app: ReturnType<typeof createApp>;

    beforeAll(async () => {
        await jwtService.initialize();

        app = createApp();
    });

    it('returns error for missing client_id', async () => {
        const res = await app.request('/authorize?redirect_uri=https://callback.example.com/auth&response_type=code');

        expect(res.status).toBe(400);

        const body = await res.json();

        expect(body.error).toBe('invalid_request');
        expect(body.error_description).toContain('client_id');
    });

    it('returns error for missing redirect_uri', async () => {
        const res = await app.request('/authorize?client_id=test-client-id&response_type=code');

        expect(res.status).toBe(400);

        const body = await res.json();

        expect(body.error).toBe('invalid_request');
        expect(body.error_description).toContain('redirect_uri');
    });

    it('returns error for invalid client_id', async () => {
        const res = await app.request(
            '/authorize?client_id=wrong-client&redirect_uri=https://callback.example.com/auth&response_type=code',
        );

        expect(res.status).toBe(401);

        const body = await res.json();

        expect(body.error).toBe('invalid_client');
    });

    it('returns error for invalid redirect_uri', async () => {
        const res = await app.request(
            '/authorize?client_id=test-client-id&redirect_uri=https://evil.com/callback&response_type=code',
        );

        expect(res.status).toBe(400);

        const body = await res.json();

        expect(body.error).toBe('invalid_request');
        expect(body.error_description).toContain('redirect_uri');
    });

    it('redirects to Steam for valid request', async () => {
        const res = await app.request(
            '/authorize?client_id=test-client-id&redirect_uri=https://callback.example.com/auth&response_type=code',
            { redirect: 'manual' },
        );

        expect(res.status).toBe(302);

        const location = res.headers.get('location');

        expect(location).toContain('steamcommunity.com/openid');
    });
});

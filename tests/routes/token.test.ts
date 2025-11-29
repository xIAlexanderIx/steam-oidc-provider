import { describe, it, expect, beforeAll } from 'bun:test';
import { jwtService } from '../../src/services/jwt';
import { createApp } from '../../src/app';

describe('/token', () => {
    let app: ReturnType<typeof createApp>;

    beforeAll(async () => {
        await jwtService.initialize();

        app = createApp();
    });

    it('returns error for invalid grant_type', async () => {
        const res = await app.request('/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grant_type: 'password',
                client_id: 'test-client-id',
                client_secret: 'test-client-secret',
            }),
        });

        expect(res.status).toBe(400);

        const body = await res.json();

        expect(body.error).toBe('unsupported_grant_type');
    });

    it('returns error for invalid client credentials', async () => {
        const res = await app.request('/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grant_type: 'authorization_code',
                code: 'test-code',
                client_id: 'wrong-client',
                client_secret: 'wrong-secret',
            }),
        });

        expect(res.status).toBe(401);

        const body = await res.json();

        expect(body.error).toBe('invalid_client');
    });

    it('returns error for missing code', async () => {
        const res = await app.request('/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grant_type: 'authorization_code',
                client_id: 'test-client-id',
                client_secret: 'test-client-secret',
            }),
        });

        expect(res.status).toBe(400);

        const body = await res.json();

        expect(body.error).toBe('invalid_request');
    });

    it('returns error for invalid code', async () => {
        const res = await app.request('/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grant_type: 'authorization_code',
                code: 'invalid-code',
                client_id: 'test-client-id',
                client_secret: 'test-client-secret',
            }),
        });

        expect(res.status).toBe(400);

        const body = await res.json();

        expect(body.error).toBe('invalid_grant');
    });
});

import { describe, it, expect, beforeAll, beforeEach, mock } from 'bun:test';
import { jwtService } from '../../src/services/jwt';
import { createApp } from '../../src/app';
import { signData } from '../../src/utils/cookie-signature';
import { config } from '../../src/config';
import type { AuthState } from '../../src/types';

describe('/callback', () => {
    let app: ReturnType<typeof createApp>;

    beforeAll(async () => {
        await jwtService.initialize();
    });

    beforeEach(() => {
        app = createApp();
    });

    describe('GET /callback', () => {
        it('should reject requests without state cookie', async () => {
            const res = await app.request('/callback');

            expect(res.status).toBe(400);

            const body = await res.json();

            expect(body.error).toBe('invalid_request');
            expect(body.error_description).toContain('Missing state cookie');
        });

        it('should reject requests with invalid/tampered state cookie', async () => {
            const res = await app.request('/callback', {
                headers: {
                    Cookie: 'oidc_state=invalid-base64-garbage',
                },
            });

            expect(res.status).toBe(400);

            const body = await res.json();

            expect(body.error).toBe('invalid_request');
            expect(body.error_description).toContain('Invalid or tampered state cookie');
        });

        it('should reject requests with invalid state cookie JSON', async () => {
            // Create a properly signed cookie but with invalid JSON content
            const invalidData = 'not valid json';

            const signedCookie = signData(invalidData, config.jwtSecret);

            const res = await app.request('/callback', {
                headers: {
                    Cookie: `oidc_state=${signedCookie}`,
                },
            });

            expect(res.status).toBe(400);

            const body = await res.json();

            expect(body.error).toBe('invalid_request');
        });

        it('should reject requests with state cookie missing required fields', async () => {
            // Create a signed cookie with incomplete AuthState (missing redirectUri)
            const invalidState = {
                clientId: 'test-client-id',
                // missing redirectUri
            };
            const signedCookie = signData(JSON.stringify(invalidState), config.jwtSecret);

            const res = await app.request('/callback', {
                headers: {
                    Cookie: `oidc_state=${signedCookie}`,
                },
            });

            expect(res.status).toBe(400);

            const body = await res.json();

            expect(body.error).toBe('invalid_request');
            expect(body.error_description).toContain('Invalid state cookie');
        });

        it('should reject requests with unauthorized redirect_uri in state', async () => {
            const authState: AuthState = {
                clientId: config.clientId,
                redirectUri: 'https://example.com/callback',
                nonce: 'test-nonce',
            };
            const signedCookie = signData(JSON.stringify(authState), config.jwtSecret);

            const res = await app.request('/callback', {
                headers: {
                    Cookie: `oidc_state=${signedCookie}`,
                },
            });

            expect(res.status).toBe(400);

            const body = await res.json();

            expect(body.error).toBe('invalid_request');
            expect(body.error_description).toContain('Invalid redirect_uri');
        });
    });
});

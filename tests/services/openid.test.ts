import { describe, it, expect } from 'bun:test';
import { openIdService } from '../../src/services/openid';

describe('OpenIdService', () => {
    describe('getAuthUrl', () => {
        it('should return Steam OpenID URL', async () => {
            const authUrl = await openIdService.getAuthUrl();

            expect(authUrl).toContain('steamcommunity.com/openid/login');
            expect(authUrl).toContain('openid.mode=checkid_setup');
        });

        it('should not include state parameter when not provided', async () => {
            const authUrl = await openIdService.getAuthUrl();

            expect(authUrl).not.toContain('state=');
        });

        it('should include state parameter when provided', async () => {
            const state = 'test-state-123';

            const authUrl = await openIdService.getAuthUrl(state);

            expect(authUrl).toContain(`state=${state}`);
        });

        it('should include return URL in auth request', async () => {
            const authUrl = await openIdService.getAuthUrl();

            expect(authUrl).toContain('openid.return_to=');
            // The callback URL is URL-encoded in the auth request
            expect(authUrl).toContain('callback');
        });

        it('should include realm in auth request', async () => {
            const authUrl = await openIdService.getAuthUrl();

            expect(authUrl).toContain('openid.realm=');
        });
    });

    describe('verifyAssertion', () => {
        it('should reject invalid callback URLs', async () => {
            // Simulate an invalid callback URL
            const callbackUrl = 'https://example.com/callback?openid.mode=cancel';

            // The OpenID library will reject this as an invalid return URL
            await expect(openIdService.verifyAssertion(callbackUrl)).rejects.toThrow();
        });

        it('should handle malformed URLs gracefully', async () => {
            // This tests error handling for completely invalid URLs
            const callbackUrl = 'not-a-valid-url';

            // Should reject with an error rather than crash
            await expect(openIdService.verifyAssertion(callbackUrl)).rejects.toThrow();
        });
    });
});

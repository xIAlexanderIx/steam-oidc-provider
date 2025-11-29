// Types
import type { Storage, AuthorizationCode, AccessToken } from '../../types';

/**
 * In-memory storage implementation
 * Suitable for single-instance deployments
 */
export class MemoryStorage implements Storage {
    private authCodes = new Map<string, AuthorizationCode>();
    private authCodeTimers = new Map<string, Timer>();

    private accessTokens = new Map<string, AccessToken>();
    private accessTokenTimers = new Map<string, Timer>();

    async saveAuthCode(pCode: AuthorizationCode): Promise<void> {
        const existingTimer = this.authCodeTimers.get(pCode.code);

        if (existingTimer) {
            clearTimeout(existingTimer);

            this.authCodeTimers.delete(pCode.code);
        }

        this.authCodes.set(pCode.code, pCode);

        const ttl = pCode.expiresAt - Date.now();

        if (ttl <= 0) return;

        const timerId = setTimeout(() => {
            this.authCodes.delete(pCode.code);

            this.authCodeTimers.delete(pCode.code);
        }, ttl);

        this.authCodeTimers.set(pCode.code, timerId);
    }

    async getAuthCode(pCode: string): Promise<AuthorizationCode | null> {
        const stored = this.authCodes.get(pCode);

        if (!stored) return null;

        if (stored.expiresAt < Date.now()) {
            await this.deleteAuthCode(pCode);

            return null;
        }

        return stored;
    }

    /**
     * Atomically retrieve and delete an authorization code
     */
    async consumeAuthCode(pCode: string): Promise<AuthorizationCode | null> {
        const stored = this.authCodes.get(pCode);

        if (!stored) return null;

        if (stored.expiresAt < Date.now()) {
            await this.deleteAuthCode(pCode);

            return null;
        }

        // Delete BEFORE returning
        await this.deleteAuthCode(pCode);

        return stored;
    }

    async deleteAuthCode(pCode: string): Promise<void> {
        this.authCodes.delete(pCode);

        const timerId = this.authCodeTimers.get(pCode);

        if (!timerId) return;

        clearTimeout(timerId);

        this.authCodeTimers.delete(pCode);
    }

    async saveAccessToken(pToken: AccessToken): Promise<void> {
        const existingTimer = this.accessTokenTimers.get(pToken.token);

        if (existingTimer) {
            clearTimeout(existingTimer);

            this.accessTokenTimers.delete(pToken.token);
        }

        this.accessTokens.set(pToken.token, pToken);

        // Schedule cleanup after expiry
        const ttl = pToken.expiresAt - Date.now();

        if (ttl <= 0) return;

        const timerId = setTimeout(() => {
            this.accessTokens.delete(pToken.token);

            this.accessTokenTimers.delete(pToken.token);
        }, ttl);

        this.accessTokenTimers.set(pToken.token, timerId);
    }

    async getAccessToken(pToken: string): Promise<AccessToken | null> {
        const stored = this.accessTokens.get(pToken);

        if (!stored) return null;

        if (stored.expiresAt < Date.now()) {
            await this.deleteAccessToken(pToken);

            return null;
        }

        return stored;
    }

    async deleteAccessToken(pToken: string): Promise<void> {
        this.accessTokens.delete(pToken);

        const timerId = this.accessTokenTimers.get(pToken);

        if (!timerId) return;

        clearTimeout(timerId);

        this.accessTokenTimers.delete(pToken);
    }
}

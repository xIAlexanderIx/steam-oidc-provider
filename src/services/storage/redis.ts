import { RedisClient } from 'bun';

// Validation
import { AuthorizationCodeSchema, AccessTokenSchema } from '../../schemas';

// Types
import type { Storage, AuthorizationCode, AccessToken } from '../../types';

const AUTH_CODE_PREFIX = 'auth_code:';
const ACCESS_TOKEN_PREFIX = 'access_token:';

/**
 * Redis storage implementation using Bun's native Redis client
 * Requires Redis server 7.2+
 * Recommended for distributed/multi-instance deployments
 */
export class RedisStorage implements Storage {
    private redis: RedisClient;

    constructor(pRedisUrl: string) {
        this.redis = new RedisClient(pRedisUrl);
    }

    async saveAuthCode(pCode: AuthorizationCode): Promise<void> {
        const ttl = Math.ceil((pCode.expiresAt - Date.now()) / 1000);

        if (ttl <= 0) return;

        const key = `${AUTH_CODE_PREFIX}${pCode.code}`;

        await this.redis.set(key, JSON.stringify(pCode), 'EX', ttl);
    }

    async getAuthCode(pCode: string): Promise<AuthorizationCode | null> {
        const data = await this.redis.get(`${AUTH_CODE_PREFIX}${pCode}`);

        if (!data) return null;

        const parsed = AuthorizationCodeSchema.safeParse(JSON.parse(data));

        if (!parsed.success) {
            console.error('Invalid auth code data:', parsed.error.message);

            await this.deleteAuthCode(pCode);

            return null;
        }

        return parsed.data;
    }

    /**
     * Atomically retrieve and delete an authorization code
     */
    async consumeAuthCode(pCode: string): Promise<AuthorizationCode | null> {
        const key = `${AUTH_CODE_PREFIX}${pCode}`;

        const data = await this.redis.getdel(key);

        if (!data) return null;

        const parsed = AuthorizationCodeSchema.safeParse(JSON.parse(data));

        if (!parsed.success) {
            console.error('Invalid auth code data:', parsed.error.message);

            return null;
        }

        return parsed.data;
    }

    async deleteAuthCode(pCode: string): Promise<void> {
        await this.redis.del(`${AUTH_CODE_PREFIX}${pCode}`);
    }

    async saveAccessToken(pToken: AccessToken): Promise<void> {
        const ttl = Math.ceil((pToken.expiresAt - Date.now()) / 1000);

        if (ttl <= 0) return;

        const key = `${ACCESS_TOKEN_PREFIX}${pToken.token}`;

        await this.redis.set(key, JSON.stringify(pToken), 'EX', ttl);
    }

    async getAccessToken(pToken: string): Promise<AccessToken | null> {
        const data = await this.redis.get(`${ACCESS_TOKEN_PREFIX}${pToken}`);

        if (!data) return null;

        const parsed = AccessTokenSchema.safeParse(JSON.parse(data));

        if (!parsed.success) {
            console.error('Invalid access token data:', parsed.error.message);

            await this.deleteAccessToken(pToken);

            return null;
        }

        return parsed.data;
    }

    async deleteAccessToken(pToken: string): Promise<void> {
        await this.redis.del(`${ACCESS_TOKEN_PREFIX}${pToken}`);
    }

    /**
     * Close Redis connection
     */
    async close(): Promise<void> {
        this.redis.close();
    }
}

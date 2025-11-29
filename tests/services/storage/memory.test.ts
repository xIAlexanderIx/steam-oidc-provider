import { describe, it, expect } from 'bun:test';
import { MemoryStorage } from '../../../src/services/storage/memory';

describe('MemoryStorage', () => {
    it('saves and retrieves auth codes', async () => {
        const storage = new MemoryStorage();

        const authCode = {
            code: 'test-code-123',
            steamId: '76561198042789158',
            clientId: 'test-client',
            redirectUri: 'https://callback.example.com',
            createdAt: Date.now(),
            expiresAt: Date.now() + 300000,
        };

        await storage.saveAuthCode(authCode);

        const retrieved = await storage.getAuthCode('test-code-123');

        expect(retrieved).not.toBeNull();
        expect(retrieved?.steamId).toBe('76561198042789158');
    });

    it('returns null for non-existent auth codes', async () => {
        const storage = new MemoryStorage();

        const result = await storage.getAuthCode('non-existent');

        expect(result).toBeNull();
    });

    it('deletes auth codes', async () => {
        const storage = new MemoryStorage();

        const authCode = {
            code: 'delete-test',
            steamId: '76561198042789158',
            clientId: 'test-client',
            redirectUri: 'https://callback.example.com',
            createdAt: Date.now(),
            expiresAt: Date.now() + 300000,
        };

        await storage.saveAuthCode(authCode);

        await storage.deleteAuthCode('delete-test');

        const result = await storage.getAuthCode('delete-test');

        expect(result).toBeNull();
    });

    it('saves and retrieves access tokens', async () => {
        const storage = new MemoryStorage();

        const token = {
            token: 'access-token-123',
            steamId: '76561198042789158',
            createdAt: Date.now(),
            expiresAt: Date.now() + 3600000,
        };

        await storage.saveAccessToken(token);

        const retrieved = await storage.getAccessToken('access-token-123');

        expect(retrieved).not.toBeNull();
        expect(retrieved?.steamId).toBe('76561198042789158');
    });
});

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

describe('getSteamProfile', () => {
    const originalFetch = globalThis.fetch;

    let fetchMock: any;

    beforeEach(() => {
        // Clear the module cache to ensure fresh imports with new fetch mock
        delete require.cache[require.resolve('../../src/services/steam')];
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('should fetch and return profile for valid Steam ID', async () => {
        const mockProfile = {
            steamid: '76561198042789158',
            personaname: 'TestUser',
            avatar: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/00/00000000.jpg',
            avatarmedium: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/00/00000000_medium.jpg',
            avatarfull: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/00/00000000_full.jpg',
            profileurl: 'https://steamcommunity.com/id/testuser/',
            personastate: 1,
        };

        globalThis.fetch = async () =>
            new Response(
                JSON.stringify({
                    response: {
                        players: [mockProfile],
                    },
                }),
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                }
            );

        const { getSteamProfile } = await import('../../src/services/steam');

        const result = await getSteamProfile('76561198042789158');

        expect(result).not.toBeNull();
        expect(result?.steamid).toBe('76561198042789158');
        expect(result?.personaname).toBe('TestUser');
        expect(result?.avatar).toContain('steamcdn-a.akamaihd.net');
    });

    it('should return null for unknown Steam ID', async () => {
        globalThis.fetch = async () =>
            new Response(
                JSON.stringify({
                    response: {
                        players: [],
                    },
                }),
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                }
            );

        const { getSteamProfile } = await import('../../src/services/steam');

        const result = await getSteamProfile('76561198000000000');

        expect(result).toBeNull();
    });

    it('should throw error on API failure', async () => {
        globalThis.fetch = async () =>
            new Response('Internal Server Error', { status: 500 });

        const { getSteamProfile } = await import('../../src/services/steam');

        await expect(getSteamProfile('76561198042789158')).rejects.toThrow('Steam API error');
    });

    it('should handle timeout gracefully', async () => {
        globalThis.fetch = async (_url: string, options?: any) => {
            // Check if AbortSignal is provided and already aborted
            if (options?.signal?.aborted) {
                throw new DOMException('The operation was aborted.', 'AbortError');
            }

            // Simulate a slow response that will be aborted
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    resolve(new Response('{}', { status: 200 }));
                }, 10000);

                // Listen for abort signal
                if (options?.signal) {
                    options.signal.addEventListener('abort', () => {
                        clearTimeout(timeout);
                        reject(new DOMException('The operation was aborted.', 'AbortError'));
                    });
                }
            });
        };

        const { getSteamProfile } = await import('../../src/services/steam');

        // The fetch should timeout and throw an error
        await expect(getSteamProfile('76561198042789158')).rejects.toThrow();
    }, 10000); // Set test timeout to 10 seconds

    it('should return null for invalid API response format', async () => {
        globalThis.fetch = async () =>
            new Response(
                JSON.stringify({
                    invalid: 'response',
                }),
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                }
            );

        const { getSteamProfile } = await import('../../src/services/steam');

        const result = await getSteamProfile('76561198042789158');

        expect(result).toBeNull();
    });

    it('should cache profile data for subsequent requests', async () => {
        let fetchCallCount = 0;

        const mockProfile = {
            steamid: '76561198042789158',
            personaname: 'TestUser',
            avatar: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/00/00000000.jpg',
            avatarmedium: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/00/00000000_medium.jpg',
            avatarfull: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/00/00000000_full.jpg',
        };

        globalThis.fetch = async () => {
            fetchCallCount++;
            return new Response(
                JSON.stringify({
                    response: {
                        players: [mockProfile],
                    },
                }),
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                }
            );
        };

        const { getSteamProfile } = await import('../../src/services/steam');

        // First call should hit the API
        const result1 = await getSteamProfile('76561198042789158');

        expect(result1).not.toBeNull();
        expect(fetchCallCount).toBe(1);

        // Second call should use cache
        const result2 = await getSteamProfile('76561198042789158');

        expect(result2).not.toBeNull();
        expect(fetchCallCount).toBe(1); // Still 1, no additional API call

        // Results should be identical
        expect(result1).toEqual(result2);
    });
});

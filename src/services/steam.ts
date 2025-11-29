import { LRUCache } from 'lru-cache';

// Config
import { config } from '../config';

// Validation
import { SteamApiResponseSchema } from '../schemas';

// Types
import type { SteamProfile } from '../types';

const STEAM_API_BASE = 'https://api.steampowered.com';
const STEAM_API_TIMEOUT_MS = 5000; // 5 second timeout
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minute cache
const CACHE_MAX_SIZE = 10000; // Max 10k profiles in memory

const profileCache = new LRUCache<string, SteamProfile>({
    max: CACHE_MAX_SIZE,
    ttl: CACHE_TTL_MS,
    updateAgeOnGet: true,
});

/**
 * Fetch a Steam user's profile from the Steam Web API
 * @param pSteamId - The 64-bit Steam ID
 * @returns The user's profile or null if not found
 */
export async function getSteamProfile(pSteamId: string): Promise<SteamProfile | null> {
    const cached = profileCache.get(pSteamId);

    if (cached) return cached;

    const url = new URL(`${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v2/`);

    url.searchParams.set('key', config.steamApiKey);
    url.searchParams.set('steamids', pSteamId);

    const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(STEAM_API_TIMEOUT_MS),
    });

    if (!response.ok) {
        throw new Error(`Steam API error: ${response.status} ${response.statusText}`);
    }

    const rawData = await response.json();

    const parsed = SteamApiResponseSchema.safeParse(rawData);

    if (!parsed.success) {
        console.error('Invalid Steam API response:', parsed.error.message);

        return null;
    }

    const data = parsed.data;

    if (data.response.players.length === 0) return null;

    const profile = data.response.players[0];

    profileCache.set(pSteamId, profile);

    return profile;
}

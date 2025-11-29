// Config
import { config } from '../../config';

// Utils
import { MemoryStorage } from './memory';
import { RedisStorage } from './redis';

// Types
import type { Storage } from '../../types';

let storageInstance: Storage | null = null;

/**
 * Creates and returns a storage instance
 * Uses Redis if REDIS_URL is configured, otherwise uses in-memory storage
 */
export function getStorage(): Storage {
    if (storageInstance) return storageInstance;

    if (config.redisUrl) {
        console.log('Using Redis storage');

        storageInstance = new RedisStorage(config.redisUrl);
    } else {
        console.log('Using in-memory storage');

        storageInstance = new MemoryStorage();
    }

    return storageInstance;
}

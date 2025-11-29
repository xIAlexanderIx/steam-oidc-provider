// Config
import { config } from '../config';

// Types
import type { Context } from 'hono';

/**
 * Compute allowed CORS origins from configured redirect URIs
 */
export function getAllowedOrigins(): string[] {
    const origins = new Set<string>();

    // Add issuer origin
    origins.add(new URL(config.issuerUrl).origin);

    // Add origins from redirect URIs
    for (const uri of config.redirectUris) {
        try {
            origins.add(new URL(uri).origin);
        } catch {
            // Skip invalid URIs
        }
    }

    return Array.from(origins);
}

/**
 * Get client IP for rate limiting
 */
export function getClientKey(pCtx: Context): string {
    return pCtx.get('clientIp') ?? 'global';
}

/**
 * Get the request protocol from context
 */
export function getRequestProtocol(pCtx: Context): string {
    return pCtx.get('protocol') ?? 'http';
}

/**
 * Check if the request is over HTTPS
 */
export function isSecureRequest(pCtx: Context): boolean {
    return getRequestProtocol(pCtx) === 'https';
}

// Standard library
import { randomBytes, timingSafeEqual } from 'crypto';

/**
 * Generate a cryptographically secure random code
 * @param pLength - Number of random bytes (default: 32)
 * @returns Base64url-encoded random string
 */
export function generateCode(pLength: number = 32): string {
    return randomBytes(pLength).toString('base64url');
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function safeCompare(pA: string, pB: string): boolean {
    if (pA.length !== pB.length) return false;

    const bufA = Buffer.from(pA, 'utf-8');
    const bufB = Buffer.from(pB, 'utf-8');

    return timingSafeEqual(bufA, bufB);
}
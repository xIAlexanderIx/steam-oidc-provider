import { createHmac, timingSafeEqual } from 'crypto';
import { safeCompare } from './crypto';

/**
 * Sign data with HMAC-SHA256 for cookie integrity
 * Format: base64url(data).base64url(signature)
 */
export function signData(pData: string, pSecret: string): string {
    const signature = createHmac('sha256', pSecret).update(pData).digest('base64url');

    return `${Buffer.from(pData).toString('base64url')}.${signature}`;
}

/**
 * Verify and extract signed data
 * Returns null if signature is invalid or tampered
 */
export function verifyData(pSignedData: string, pSecret: string): string | null {
    const parts = pSignedData.split('.');

    if (parts.length !== 2) return null;

    const [encodedData, signature] = parts;

    try {
        const data = Buffer.from(encodedData, 'base64url').toString('utf-8');

        const expectedSig = createHmac('sha256', pSecret).update(data).digest('base64url');

        if (!safeCompare(signature, expectedSig)) return null;

        return data;
    } catch {
        return null;
    }
}

import { SignJWT, importJWK } from 'jose';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { ed25519 } from '@noble/curves/ed25519.js';

// Internal modules
import { config } from '../config';

// Types
import type { KeyLike, JWK } from 'jose';
import type { IdTokenClaims } from '../types';

const KEY_ID = 'steam-oidc-key-1';

/**
 * Derive an Ed25519 keypair from a passphrase using HKDF
 */
function deriveKeyPair(pSecret: string): { privateKey: Uint8Array; publicKey: Uint8Array } {
    const encoder = new TextEncoder();

    // Derive 32 bytes from the secret using HKDF
    const seed = hkdf(sha256, encoder.encode(pSecret), encoder.encode('steam-oidc-provider'), encoder.encode('ed25519-seed'), 32);

    // Generate Ed25519 keypair from seed
    const publicKey = ed25519.getPublicKey(seed);

    return { privateKey: seed, publicKey };
}

/**
 * Convert Ed25519 keys to JWK format
 */
function toJwk(pPrivateKey: Uint8Array, pPublicKey: Uint8Array): { privateJwk: JWK; publicJwk: JWK } {
    // Base64url encode the keys
    const d = Buffer.from(pPrivateKey).toString('base64url');
    const x = Buffer.from(pPublicKey).toString('base64url');

    const publicJwk: JWK = {
        kty: 'OKP',
        crv: 'Ed25519',
        x,
        kid: KEY_ID,
        use: 'sig',
        alg: 'EdDSA',
    };

    const privateJwk: JWK = {
        ...publicJwk,
        d,
    };

    return { privateJwk, publicJwk };
}

/**
 * JWT service for signing tokens and exporting JWKS
 */
class JwtService {
    private privateKey: KeyLike | null = null;
    private publicJwk: JWK | null = null;
    private initialized = false;

    /**
     * Initialize the JWT service by deriving Ed25519 keys from the secret
     * Must be called before using other methods
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            // Derive Ed25519 keypair from secret
            const { privateKey, publicKey } = deriveKeyPair(config.jwtSecret);

            // Convert to JWK format
            const { privateJwk, publicJwk } = toJwk(privateKey, publicKey);

            // Import private key for signing
            this.privateKey = (await importJWK(privateJwk, 'EdDSA')) as KeyLike;

            this.publicJwk = publicJwk;

            this.initialized = true;

            console.log('JWT service initialized with Ed25519 keys');
        } catch (pError) {
            throw new Error(`Failed to initialize JWT service: ${pError instanceof Error ? pError.message : 'Unknown error'}`);
        }
    }

    /**
     * Sign an ID token with the configured claims
     */
    async signIdToken(pClaims: IdTokenClaims): Promise<string> {
        if (!this.privateKey) throw new Error('JWT service not initialized');

        return new SignJWT({ ...pClaims })
            .setProtectedHeader({ alg: 'EdDSA', kid: KEY_ID, typ: 'JWT' })
            .setIssuedAt(pClaims.iat)
            .setExpirationTime(pClaims.exp)
            .setIssuer(pClaims.iss)
            .setSubject(pClaims.sub)
            .setAudience(pClaims.aud)
            .sign(this.privateKey);
    }

    /**
     * Sign an access token (opaque JWT)
     */
    async signAccessToken(pSteamId: string): Promise<string> {
        if (!this.privateKey) throw new Error('JWT service not initialized');

        const now = Math.floor(Date.now() / 1000);

        return new SignJWT({ sub: pSteamId })
            .setProtectedHeader({ alg: 'EdDSA', kid: KEY_ID, typ: 'JWT' })
            .setIssuedAt(now)
            .setExpirationTime(now + config.accessTokenTtl)
            .setIssuer(config.issuerUrl)
            .sign(this.privateKey);
    }

    /**
     * Get the JSON Web Key Set for the /jwks endpoint
     */
    getJwks(): { keys: JWK[] } {
        if (!this.publicJwk) throw new Error('JWT service not initialized');

        return { keys: [this.publicJwk] };
    }
}

export const jwtService = new JwtService();

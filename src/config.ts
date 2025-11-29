/**
 * Application configuration loaded from environment variables
 */
export interface Config {
    // Required
    steamApiKey: string;
    clientId: string;
    clientSecret: string;
    issuerUrl: string;
    redirectUris: string[];
    jwtSecret: string;

    // Optional with defaults
    redisUrl?: string;
    accessTokenTtl: number;
    authCodeTtl: number;
    port: number;
    basePath: string;
    trustedProxy: boolean;
}

/**
 * Validates required environment variables and returns config object
 * Fails fast if any required variable is missing
 */
function loadConfig(): Config {
    const requiredVars = ['STEAM_API_KEY', 'CLIENT_ID', 'CLIENT_SECRET', 'ISSUER_URL', 'REDIRECT_URIS', 'JWT_SECRET'] as const;

    const missing: string[] = [];

    for (const varName of requiredVars) {
        if (!process.env[varName]) {
            missing.push(varName);
        }
    }

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Parse redirect URIs from comma-separated list
    const redirectUris = process.env
        .REDIRECT_URIS!.split(',')
        .map((pUri) => pUri.trim())
        .filter((pUri) => pUri.length > 0);

    if (redirectUris.length === 0) {
        throw new Error('REDIRECT_URIS must contain at least one valid URL');
    }

    // Validate JWT secret length
    const jwtSecret = process.env.JWT_SECRET!;

    if (jwtSecret.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters long');
    }

    // Normalize base path: ensure leading slash, no trailing slash
    let basePath = process.env.BASE_PATH ?? '/';

    if (basePath !== '/') {
        if (!basePath.startsWith('/')) basePath = `/${basePath}`;

        basePath = basePath.replace(/\/$/, '');
    }

    // Build issuer URL with base path included
    let issuerUrl = process.env.ISSUER_URL!.replace(/\/$/, '');

    if (basePath !== '/') {
        issuerUrl = `${issuerUrl}${basePath}`;
    }

    return {
        steamApiKey: process.env.STEAM_API_KEY!,
        clientId: process.env.CLIENT_ID!,
        clientSecret: process.env.CLIENT_SECRET!,
        issuerUrl,
        redirectUris,
        jwtSecret,
        redisUrl: process.env.REDIS_URL,
        accessTokenTtl: parseInt(process.env.ACCESS_TOKEN_TTL ?? '3600', 10),
        authCodeTtl: parseInt(process.env.AUTH_CODE_TTL ?? '300', 10),
        port: parseInt(process.env.PORT ?? '3000', 10),
        basePath,
        trustedProxy: process.env.TRUSTED_PROXY === 'true',
    };
}

export const config = loadConfig();

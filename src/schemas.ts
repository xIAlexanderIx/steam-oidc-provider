import { z } from 'zod';

// 17-digit Steam ID pattern
const steamIdPattern = /^\d{17}$/;

export const AuthorizationCodeSchema = z.object({
    code: z.string().min(1),
    steamId: z.string().regex(steamIdPattern, 'Invalid Steam ID format'),
    clientId: z.string().min(1),
    redirectUri: z.url(),
    nonce: z.string().optional(),
    codeChallenge: z.string().optional(),
    codeChallengeMethod: z.string().optional(),
    createdAt: z.number().int().positive(),
    expiresAt: z.number().int().positive(),
});

export const AccessTokenSchema = z.object({
    token: z.string().min(1),
    steamId: z.string().regex(steamIdPattern, 'Invalid Steam ID format'),
    createdAt: z.number().int().positive(),
    expiresAt: z.number().int().positive(),
});

export const AuthStateSchema = z.object({
    state: z.string().optional(),
    nonce: z.string().optional(),
    redirectUri: z.url(),
    clientId: z.string().min(1),
    codeChallenge: z.string().optional(),
    codeChallengeMethod: z.string().optional(),
});

export const SteamProfileSchema = z.object({
    steamid: z.string().regex(steamIdPattern, 'Invalid Steam ID format'),
    personaname: z.string(),
    avatar: z.url(),
    avatarmedium: z.url(),
    avatarfull: z.url(),
    profileurl: z.string().optional(),
    personastate: z.number().optional(),
});

export const SteamApiResponseSchema = z.object({
    response: z.object({
        players: z.array(SteamProfileSchema),
    }),
});

export const TokenRequestSchema = z.object({
    grant_type: z.string(),
    code: z.string().optional(),
    redirect_uri: z.string().optional(),
    client_id: z.string().optional(),
    client_secret: z.string().optional(),
    code_verifier: z.string().optional(),
});

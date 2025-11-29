/**
 * Steam profile data from the Steam Web API
 */
export interface SteamProfile {
    steamid: string;
    personaname: string;
    avatar: string;
    avatarmedium: string;
    avatarfull: string;
    profileurl?: string;
    personastate?: number;
}

/**
 * Authorization code stored during OIDC flow
 */
export interface AuthorizationCode {
    code: string;
    steamId: string;
    clientId: string;
    redirectUri: string;
    nonce?: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
    createdAt: number;
    expiresAt: number;
}

/**
 * Access token storage
 */
export interface AccessToken {
    token: string;
    steamId: string;
    createdAt: number;
    expiresAt: number;
}

/**
 * OIDC token endpoint response
 */
export interface TokenResponse {
    access_token: string;
    token_type: 'Bearer';
    expires_in: number;
    id_token: string;
}

/**
 * ID token JWT claims
 */
export interface IdTokenClaims {
    iss: string;
    sub: string;
    aud: string;
    exp: number;
    iat: number;
    nonce?: string;
    name: string;
    picture: string;
    preferred_username: string;
}

/**
 * OIDC error response
 */
export interface OidcErrorResponse {
    error: string;
    error_description?: string;
}

/**
 * Storage interface for auth codes and tokens
 */
export interface Storage {
    saveAuthCode(pCode: AuthorizationCode): Promise<void>;
    getAuthCode(pCode: string): Promise<AuthorizationCode | null>;
    deleteAuthCode(pCode: string): Promise<void>;
    consumeAuthCode(pCode: string): Promise<AuthorizationCode | null>;

    saveAccessToken(pToken: AccessToken): Promise<void>;
    getAccessToken(pToken: string): Promise<AccessToken | null>;
    deleteAccessToken(pToken: string): Promise<void>;
}

/**
 * State stored in cookie during auth flow
 */
export interface AuthState {
    state?: string;
    nonce?: string;
    redirectUri: string;
    clientId: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
}

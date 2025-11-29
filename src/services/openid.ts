import openid from 'openid';

// Config
import { config } from '../config';

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid';

/**
 * Steam OpenID 2.0 service
 * Handles authentication with Steam's OpenID provider
 */
class OpenIdService {
    private relyingParty: openid.RelyingParty;

    constructor() {
        const returnUrl = `${config.issuerUrl}/callback`;
        const realm = config.issuerUrl;

        this.relyingParty = new openid.RelyingParty(
            returnUrl, // Verification URL (callback)
            realm, // Realm (our domain)
            true, // Stateless verification
            false, // Strict mode disabled
            [], // Extensions
        );
    }

    /**
     * Get the Steam OpenID authentication URL
     * @param pState - Optional state parameter to include
     */
    async getAuthUrl(pState?: string): Promise<string> {
        return new Promise((resolve, reject) => {
            this.relyingParty.authenticate(
                STEAM_OPENID_URL,
                false, // Not immediate
                (pError, pAuthUrl) => {
                    if (pError) {
                        reject(new Error(pError.message));
                        return;
                    }

                    if (!pAuthUrl) {
                        reject(new Error('No authentication URL returned from Steam'));
                        return;
                    }

                    // Append state parameter if provided
                    if (pState) {
                        const url = new URL(pAuthUrl);
                        url.searchParams.set('state', pState);
                        resolve(url.toString());
                    } else {
                        resolve(pAuthUrl);
                    }
                },
            );
        });
    }

    /**
     * Verify the OpenID assertion from Steam callback
     * @param pRequestUrl - The full callback URL with query parameters
     * @returns The Steam ID (64-bit) if verified, null if not authenticated
     */
    async verifyAssertion(pRequestUrl: string): Promise<string | null> {
        return new Promise((resolve, reject) => {
            this.relyingParty.verifyAssertion(pRequestUrl, (pError, pResult) => {
                if (pError) {
                    reject(new Error(pError.message));
                    return;
                }

                if (!pResult || !pResult.authenticated) {
                    resolve(null);
                    return;
                }

                // Extract SteamID from claimed identifier
                // Format: https://steamcommunity.com/openid/id/<steamid64>
                const match = pResult.claimedIdentifier?.match(/\/id\/(\d+)$/);
                resolve(match ? match[1] : null);
            });
        });
    }
}

export const openIdService = new OpenIdService();

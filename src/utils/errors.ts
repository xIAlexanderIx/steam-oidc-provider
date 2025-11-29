/**
 * Build OAuth error redirect URL
 */
export function buildErrorRedirect(pRedirectUri: string, pDescription: string, pState?: string): string {
    const errorUrl = new URL(pRedirectUri);

    errorUrl.searchParams.set('error', 'access_denied');
    errorUrl.searchParams.set('error_description', pDescription);

    if (pState) {
        errorUrl.searchParams.set('state', pState);
    }

    return errorUrl.toString();
}

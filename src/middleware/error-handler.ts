// Types
import type { Context, ErrorHandler } from 'hono';
import type { OidcErrorResponse } from '../types';

type OidcStatusCode = 400 | 401 | 403 | 500;

/**
 * Custom OIDC error class
 */
export class OidcError extends Error {
    constructor(
        public code: string,
        public description: string,
        public statusCode: OidcStatusCode = 400,
    ) {
        super(description);
        this.name = 'OidcError';
    }
}

/**
 * Check if an error is an OidcError (handles module boundary issues)
 */
function isOidcError(pError: unknown): pError is OidcError {
    return (
        pError instanceof OidcError ||
        (pError instanceof Error &&
            pError.name === 'OidcError' &&
            'code' in pError &&
            'statusCode' in pError)
    );
}

/**
 * Global error handler for Hono
 * Catches errors and returns OIDC-compliant error responses
 */
export const errorHandler: ErrorHandler = (pError, pCtx: Context) => {
    if (process.env.NODE_ENV !== 'test') {
        console.error('Error:', pError);
    }

    // Handle OidcError
    if (isOidcError(pError)) {
        const response: OidcErrorResponse = {
            error: pError.code,
            error_description: pError.description,
        };

        return pCtx.json(response, pError.statusCode);
    }

    // Handle generic errors
    const response: OidcErrorResponse = {
        error: 'server_error',
        error_description: pError instanceof Error ? pError.message : 'An unexpected error occurred',
    };

    return pCtx.json(response, 500);
};

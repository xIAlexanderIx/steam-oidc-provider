import { Hono } from 'hono';

// Services
import { jwtService } from '../services/jwt';

const jwks = new Hono();

/**
 * JSON Web Key Set endpoint
 * Returns the public keys used to verify JWTs
 */
jwks.get('/jwks', (pCtx) => {
    return pCtx.json(jwtService.getJwks());
});

export { jwks };

import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { rateLimiter } from 'hono-rate-limiter';

// Middlewares
import { errorHandler } from './middleware/error-handler';
import { requestContext } from './middleware/request-context';

// Routes
import { registerRoutes } from './routes';

// Config
import { config } from './config';

// Utils
import { getAllowedOrigins, getClientKey } from './utils/misc';

const allowedOrigins = getAllowedOrigins();

/**
 * Create and configure the Hono application
 */
export function createApp(): Hono {
    const basePath = config.basePath !== '/' ? config.basePath : undefined;

    const app = basePath ? new Hono().basePath(basePath) : new Hono();

    // Global error handler
    app.onError(errorHandler);

    // Security headers
    app.use(
        '*',
        secureHeaders({
            strictTransportSecurity: 'max-age=31536000; includeSubDomains',
            xContentTypeOptions: 'nosniff',
            xFrameOptions: 'DENY',
            contentSecurityPolicy: {
                defaultSrc: ["'none'"],
                frameAncestors: ["'none'"],
            },
            referrerPolicy: 'no-referrer',
        }),
    );

    // Logging
    if (process.env.NODE_ENV !== 'test') {
        app.use('*', logger());
    }

    // Request context (protocol, client IP)
    app.use('*', requestContext);

    // CORS - restricted to known client origins
    app.use('*', cors({
        origin: (pOrigin) => {
            if (!pOrigin) return null;

            return allowedOrigins.includes(pOrigin) ? pOrigin : null;
        },
        credentials: true,
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: ['Authorization', 'Content-Type'],
        maxAge: 86400, // 24 hours - cache preflight responses
    }));

    app.use('/token', rateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        limit: 10, // 10 requests per window
        standardHeaders: 'draft-6',
        keyGenerator: getClientKey,
    }));

    app.use('/authorize', rateLimiter({
        windowMs: 5 * 60 * 1000, // 5 minutes
        limit: 30,
        standardHeaders: 'draft-6',
        keyGenerator: getClientKey,
    }));

    app.use('*', rateLimiter({
        windowMs: 60 * 1000, // 1 minute
        limit: 100,
        standardHeaders: 'draft-6',
        keyGenerator: getClientKey,
    }));

    registerRoutes(app);

    return app;
}

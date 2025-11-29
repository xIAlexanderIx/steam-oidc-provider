// Routes
import { discovery } from './discovery';
import { authorize } from './authorize';
import { callback } from './callback';
import { token } from './token';
import { jwks } from './jwks';
import { userinfo } from './userinfo';
import { health } from './health';

// Types
import type { Hono } from 'hono';

/**
 * Register all routes on the app
 */
export function registerRoutes(pApp: Hono): void {
    pApp.route('', discovery);
    pApp.route('', jwks);
    pApp.route('', authorize);
    pApp.route('', callback);
    pApp.route('', token);
    pApp.route('', userinfo);
    pApp.route('', health);
}

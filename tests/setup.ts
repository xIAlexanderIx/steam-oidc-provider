/**
 * Test environment setup
 * This file is preloaded before tests run to set up required env vars
 */

process.env.STEAM_API_KEY = 'test-steam-api-key';
process.env.CLIENT_ID = 'test-client-id';
process.env.CLIENT_SECRET = 'test-client-secret';
process.env.ISSUER_URL = 'https://test.example.com';
process.env.REDIRECT_URIS = 'https://callback.example.com/auth,https://other.example.com/callback';
process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';
process.env.NODE_ENV = 'test';

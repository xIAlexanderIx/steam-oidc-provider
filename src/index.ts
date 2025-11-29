import { createApp } from './app';

// Services
import { getStorage } from './services/storage';
import { jwtService } from './services/jwt';

// Config
import { config } from './config';

// Types
import type { Server } from 'bun';

let server: Server<unknown>;

/**
 * Main application entry point
 * Initializes server and registers shutdown handlers
 */
async function main(): Promise<void> {
    console.log('Starting Steam OIDC Provider...');

    // Initialize JWT service (validates key)
    await jwtService.initialize();

    const app = createApp();

    console.log(`Server listening on port ${config.port}`);
    console.log(`Issuer URL: ${config.issuerUrl}`);
    console.log(`Discovery: ${config.issuerUrl}/.well-known/openid-configuration`);

    server = Bun.serve({ port: config.port, fetch: app.fetch });

    // Register shutdown handlers
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

/**
 * Gracefully shutdown the server
 * Closes connections and cleans up resources
 */
async function shutdown(pSignal: string): Promise<void> {
    console.log(`Received ${pSignal}, shutting down gracefully...`);

    // Set timeout for forceful exit
    const forceExitTimeout = setTimeout(() => {
        console.error('Forceful shutdown after timeout');

        process.exit(1);
    }, 10000);

    try {
        if (server) server.stop();

        const storage = getStorage();

        if ('close' in storage && typeof storage.close === 'function') {
            console.log('Closing storage connection...');

            await storage.close();
        }

        clearTimeout(forceExitTimeout);

        console.log('Shutdown complete');

        process.exit(0);
    } catch (pError) {
        console.error('Error during shutdown:', pError);

        process.exit(1);
    }
}

main().catch((pError) => {
    console.error('Failed to start server:', pError);
    process.exit(1);
});

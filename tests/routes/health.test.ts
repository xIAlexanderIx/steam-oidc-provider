import { describe, it, expect, beforeAll } from 'bun:test';
import { jwtService } from '../../src/services/jwt';
import { createApp } from '../../src/app';

describe('/health', () => {
    let app: ReturnType<typeof createApp>;

    beforeAll(async () => {
        await jwtService.initialize();

        app = createApp();
    });

    it('returns health status with expected structure', async () => {
        const res = await app.request('/health');

        // May be 200 or 503 depending on Steam reachability
        expect([200, 503]).toContain(res.status);

        const body = await res.json();

        expect(body).toHaveProperty('status');
        expect(body).toHaveProperty('steam');
        expect(body).toHaveProperty('timestamp');
        expect(['healthy', 'degraded']).toContain(body.status);
        expect(['reachable', 'unreachable']).toContain(body.steam);
    });
});

# Steam OIDC Provider

[![CI](https://github.com/xialexanderix/steam-oidc-provider/actions/workflows/ci.yml/badge.svg)](https://github.com/xialexanderix/steam-oidc-provider/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An OpenID Connect (OIDC) identity provider that wraps Steam's legacy OpenID 2.0 authentication. This allows modern identity providers like Keycloak and Authentik to support "Login with Steam."

## Why This Exists

Steam uses [OpenID 2.0](https://openid.net/specs/openid-authentication-2_0.html), a protocol from 2007 that was deprecated in 2014. Modern identity providers only support [OpenID Connect](https://openid.net/connect/) (OIDC), the current standard.

This service acts as a translation layer:

```
Your App → Keycloak → Steam OIDC Provider → Steam
              ↑              ↑                  ↑
         speaks OIDC    translates         speaks OpenID 2.0
```

## Quick Start

```bash
docker run -d \
  -p 3000:3000 \
  -e STEAM_API_KEY=your_steam_api_key \
  -e CLIENT_ID=steam \
  -e CLIENT_SECRET=your_secret_here \
  -e ISSUER_URL=https://steam-oidc.yourdomain.com \
  -e REDIRECT_URIS=https://keycloak.yourdomain.com/realms/main/broker/steam/endpoint \
  -e JWT_SECRET=your-secret-passphrase-at-least-32-characters \
  ghcr.io/xialexanderix/steam-oidc-provider
```

Point your identity provider to:
```
https://steam-oidc.yourdomain.com/.well-known/openid-configuration
```

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STEAM_API_KEY` | Yes | -- | Steam Web API key ([get one here](https://steamcommunity.com/dev/apikey)) |
| `CLIENT_ID` | Yes | -- | Identifier for your application |
| `CLIENT_SECRET` | Yes | -- | Shared secret with your identity provider |
| `ISSUER_URL` | Yes | -- | Public URL of this service |
| `REDIRECT_URIS` | Yes | -- | Comma-separated list of allowed callback URLs |
| `JWT_SECRET` | Yes | -- | Secret for signing tokens (min 32 characters) |
| `REDIS_URL` | No | -- | Redis URL for multi-instance deployments |
| `ACCESS_TOKEN_TTL` | No | `3600` | Access token lifetime in seconds |
| `AUTH_CODE_TTL` | No | `300` | Authorization code lifetime in seconds |
| `PORT` | No | `3000` | HTTP port |
| `BASE_PATH` | No | `/` | Base path for subpath mounting |
| `TRUSTED_PROXY` | No | `false` | Trust X-Forwarded-For headers for rate limiting |

> **Note:** When `BASE_PATH` is set, it is automatically appended to `ISSUER_URL`. For example, setting `ISSUER_URL=https://example.com` and `BASE_PATH=/oidc` results in an effective issuer of `https://example.com/oidc`. You don't need to include the path in both variables.

### Generating a JWT Secret

```bash
openssl rand -hex 32
```

This generates a 64-character cryptographically secure random string. Use the same secret across all instances.

## Installation

### Docker

```bash
docker run -d \
  --name steam-oidc \
  -p 3000:3000 \
  --env-file .env \
  ghcr.io/xialexanderix/steam-oidc-provider
```

### Docker Compose

```yaml
services:
  steam-oidc:
    image: ghcr.io/xialexanderix/steam-oidc-provider
    ports:
      - "3000:3000"
    environment:
      - STEAM_API_KEY=${STEAM_API_KEY}
      - CLIENT_ID=${CLIENT_ID}
      - CLIENT_SECRET=${CLIENT_SECRET}
      - ISSUER_URL=${ISSUER_URL}
      - REDIRECT_URIS=${REDIRECT_URIS}
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  redis:
    image: redis:7.2-alpine
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

### From Source

Requires [Bun](https://bun.sh):

```bash
git clone https://github.com/xialexanderix/steam-oidc-provider
cd steam-oidc-provider
bun install
cp .env.example .env
# Edit .env with your values
bun run src/index.ts
```

## Keycloak Integration

### 1. Add Identity Provider

1. Go to **Identity Providers** → **Add provider** → **OpenID Connect v1.0**
2. Configure:

| Field | Value |
|-------|-------|
| Alias | `steam` |
| Display Name | `Steam` |
| Discovery endpoint | `https://your-steam-oidc/.well-known/openid-configuration` |
| Client ID | Your `CLIENT_ID` value |
| Client Secret | Your `CLIENT_SECRET` value |
| Client Authentication | `Client secret sent as post` |

### 2. Configure Redirect URI

After saving, Keycloak displays a Redirect URI:
```
https://keycloak.example.com/realms/your-realm/broker/steam/endpoint
```

Add this URL to your `REDIRECT_URIS` environment variable.

### 3. Attribute Mappers (Optional)

To store Steam data on user profiles:

| Source Claim | Target | Type |
|--------------|--------|------|
| `sub` | `steam_id` | User Attribute |
| `preferred_username` | -- | Username |
| `picture` | `avatar` | User Attribute |

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `/.well-known/openid-configuration` | OIDC discovery document |
| `/jwks` | Public keys for token verification |
| `/authorize` | Authorization endpoint |
| `/token` | Token exchange endpoint |
| `/userinfo` | User profile endpoint |
| `/health` | Health check |

## User Claims

Authenticated users include these claims:

| Claim | Description | Example |
|-------|-------------|---------|
| `sub` | Steam ID (64-bit) | `76561198042789158` |
| `name` | Display name | `PlayerOne` |
| `preferred_username` | Display name | `PlayerOne` |
| `picture` | Avatar URL | `https://avatars.steamstatic.com/...` |

## Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌─────────────┐     ┌───────┐
│   User   │     │ Keycloak │     │ Steam OIDC  │     │ Steam │
└────┬─────┘     └────┬─────┘     └──────┬──────┘     └───┬───┘
     │                │                  │                │
     │ 1. Login       │                  │                │
     │───────────────>│                  │                │
     │                │ 2. /authorize    │                │
     │<───────────────────────────────── │                │
     │                │                  │                │
     │ 3. Redirect to Steam              │                │
     │<──────────────────────────────────│                │
     │                │                  │                │
     │ 4. Authenticate│                  │                │
     │────────────────────────────────────────────────────>
     │                │                  │                │
     │                │                  │ 5. Callback    │
     │                │                  │<───────────────│
     │                │                  │                │
     │                │                  │ 6. Verify +    │
     │                │                  │    Get Profile │
     │                │                  │───────────────>│
     │                │                  │<───────────────│
     │                │                  │                │
     │ 7. Auth code   │                  │                │
     │<──────────────────────────────────│                │
     │───────────────>│                  │                │
     │                │ 8. Token exchange│                │
     │                │─────────────────>│                │
     │                │<─────────────────│                │
     │                │                  │                │
     │ 9. Complete    │                  │                │
     │<───────────────│                  │                │
```

## Production Deployment

### Scaling

Multiple instances require:
- Same `JWT_SECRET` across all instances (ensures identical signing keys)
- Redis for shared state (`REDIS_URL`)

```
        ┌──────────────┐
        │ Load Balancer│
        └──────┬───────┘
     ┌─────────┼─────────┐
     ▼         ▼         ▼
┌────────┐┌────────┐┌────────┐
│Instance││Instance││Instance│
└───┬────┘└───┬────┘└───┬────┘
    └─────────┼─────────┘
              ▼
        ┌──────────┐
        │  Redis   │
        └──────────┘
```

### Reverse Proxy

If mounting under a subpath:

**Option 1: Proxy strips prefix**
```nginx
location /auth/steam/ {
    proxy_pass http://steam-oidc:3000/;
}
```

**Option 2: Proxy forwards prefix**
```nginx
location /auth/steam/ {
    proxy_pass http://steam-oidc:3000/auth/steam/;
}
```
Set `BASE_PATH=/auth/steam` for option 2.

### Health Checks

Use `/health` for load balancer and container health checks.

## Security

- **HTTPS required** in production, OAuth security depends on it
- **`JWT_SECRET`** must be kept confidential and consistent across instances
- **`REDIRECT_URIS`** whitelist prevents open redirect attacks
- Tokens are signed with **Ed25519**

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| Invalid redirect_uri | URI mismatch | Ensure `REDIRECT_URIS` contains the exact callback URL |
| JWT verification failed | Secret mismatch | Use identical `JWT_SECRET` on all instances |
| Steam callback error | Unreachable service | Verify `ISSUER_URL` is publicly accessible |
| Missing state cookie | Session timeout | Check HTTPS and cookie settings |

## Background: OpenID 2.0 vs OpenID Connect

**OpenID 2.0** (2007):
- Authentication via URL-based identifiers
- Signature verification through HTTP callbacks
- No standardized token format

**OpenID Connect** (2014):
- Built on OAuth 2.0
- JWT-based ID tokens
- Standardized discovery and user info endpoints

These protocols are incompatible. This service translates between them by verifying Steam's OpenID 2.0 assertions and issuing OIDC-compliant tokens.

## Resources

- [OpenID Connect Core Specification](https://openid.net/specs/openid-connect-core-1_0.html)
- [Steam Web API Documentation](https://developer.valvesoftware.com/wiki/Steam_Web_API)
- [Keycloak Identity Broker Documentation](https://www.keycloak.org/docs/latest/server_admin/#_identity_broker)

## License

[MIT](LICENSE) © Alexander

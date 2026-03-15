---
title: Configuration
layout: default
nav_order: 3
---

# Configuration Reference
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

All configuration can be provided via `configs/config.yaml` or environment variables. Environment variables take precedence over the config file.

## Server

| Key | Env Variable | Default | Description |
|-----|-------------|---------|-------------|
| `server.host` | `CF_TUNNEL_UI_SERVER_HOST` | `0.0.0.0` | Listen address |
| `server.port` | `CF_TUNNEL_UI_SERVER_PORT` | `8080` | HTTP port |
| `server.debug` | `CF_TUNNEL_UI_SERVER_DEBUG` | `false` | Enable debug logging |

## Cloudflare

| Key | Env Variable | Required | Description |
|-----|-------------|----------|-------------|
| `cloudflare.api_token` | `CF_TUNNEL_UI_CLOUDFLARE_API_TOKEN` | ✅ | Cloudflare API token |
| `cloudflare.account_id` | `CF_TUNNEL_UI_CLOUDFLARE_ACCOUNT_ID` | ✅ | Account ID (found in Cloudflare dashboard URL) |
| `cloudflare.email` | `CF_TUNNEL_UI_CLOUDFLARE_EMAIL` | ✅ | Cloudflare account email |

### Creating an API Token

Create a **Custom Token** at [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) with:

| Permission | Level |
|-----------|-------|
| Account > Cloudflare Tunnel | Edit |
| Zone > DNS | Edit |
| Account > Zero Trust | Edit |
| Zone > Zone | Read |

## Authentication

| Key | Env Variable | Default | Description |
|-----|-------------|---------|-------------|
| `auth.access_team_domain` | `CF_TUNNEL_UI_AUTH_ACCESS_TEAM_DOMAIN` | `""` | Cloudflare Access team domain (disables auth if empty) |
| `auth.access_aud` | `CF_TUNNEL_UI_AUTH_ACCESS_AUD` | `""` | Cloudflare Access Application AUD |

{: .warning }
Leave `auth.access_team_domain` empty **only** in trusted local-only environments. Always protect internet-exposed deployments with Cloudflare Access.

## Full Example Config

```yaml
# configs/config.yaml

server:
  host: "0.0.0.0"
  port: 8080
  debug: false

cloudflare:
  api_token: "your-api-token-here"
  account_id: "your-32-char-account-id"
  email: "you@example.com"

auth:
  # Protect the UI with Cloudflare Access JWT validation.
  # Leave both empty to allow unauthenticated access (local dev only).
  access_team_domain: ""  # e.g. "myteam.cloudflareaccess.com"
  access_aud: ""          # Application AUD tag from Zero Trust > Access
```

## Environment Variable Naming

All config keys map to environment variables following the pattern:

```
CF_TUNNEL_UI_<SECTION>_<KEY>
```

Examples:
- `server.port` → `CF_TUNNEL_UI_SERVER_PORT`
- `cloudflare.api_token` → `CF_TUNNEL_UI_CLOUDFLARE_API_TOKEN`
- `auth.access_team_domain` → `CF_TUNNEL_UI_AUTH_ACCESS_TEAM_DOMAIN`

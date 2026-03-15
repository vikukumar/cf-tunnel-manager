# Cloudflare Tunnel UI

A self-hosted management UI for [Cloudflare Tunnels](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/), built with Go and React. Manage tunnels, hostnames, DNS records, and private network routes  -  all secured by [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/).

## Features

- **Tunnel management**  -  create, view, delete Cloudflare tunnels; copy the run token
- **Hostname routing**  -  add and remove public ingress rules (HTTP, HTTPS, SSH, RDP, SMB, TCP, Unix) with optional automatic DNS CNAME creation
- **Private network routes**  -  manage Zero Trust network routes (CIDR ranges) per tunnel
- **DNS records**  -  list, create, and delete DNS records across all zones
- **Dashboard**  -  at-a-glance health summary with connection status per tunnel
- **Cloudflare One auth**  -  access is gated by CF Access JWT validation (OIDC/JWKS)
- **Single binary**  -  Go binary with the React SPA embedded; configure via a single YAML file

---

## Architecture

```
cloudflare-tunnel-ui/
├-- cmd/server/           # Go binary entry point + embedded frontend
│   ├-- main.go
│   ├-- static.go         # //go:embed web/dist
│   └-- web/dist/         # Vite build output (embedded into binary)
├-- internal/
│   ├-- config/           # Viper-based YAML + env config loader
│   ├-- cfapi/            # Cloudflare REST API service layer
│   │   ├-- client.go     # Base HTTP client with envelope unwrapping
│   │   ├-- tunnels.go    # Tunnel + ingress operations
│   │   ├-- dns.go        # DNS record operations
│   │   ├-- routes.go     # Private network routes (Zero Trust)
│   │   └-- zones.go      # Zone listing
│   └-- api/
│       ├-- middleware/auth.go   # CF Access JWT validation
│       ├-- handlers/            # Echo HTTP handlers
│       └-- server.go            # Route registration + static SPA serving
├-- web/                  # React + TypeScript frontend source
│   ├-- src/
│   │   ├-- api/          # Typed API client + TypeScript interfaces
│   │   ├-- components/   # Shared UI components (Button, Card, Modal, ...)
│   │   └-- pages/        # Route pages (Dashboard, Tunnels, DNS, Routes)
│   └-- vite.config.ts    # Builds to ../cmd/server/web/dist
└-- configs/
    └-- config.yaml       # Your configuration (never commit credentials)
```

---

## Prerequisites

| Tool | Minimum version |
|------|----------------|
| Go   | 1.22            |
| Node.js | 20 LTS       |
| npm  | 10              |

All Go and npm packages are open-source and listed in `go.mod` / `package.json`.

---

## Quick Start

### 1. Clone and configure

```bash
git clone https://github.com/yourorg/cloudflare-tunnel-ui.git
cd cloudflare-tunnel-ui

# Create your config file from the sample
cp configs/config.yaml configs/config.yaml   # already present
```

Edit `configs/config.yaml`:

```yaml
server:
  port: 8080

cloudflare:
  api_token: "YOUR_CLOUDFLARE_API_TOKEN"
  account_id: "YOUR_CLOUDFLARE_ACCOUNT_ID"

auth:
  cloudflare_access:
    enabled: false          # set true in production
    team_domain: "your-team.cloudflareaccess.com"
    audience: "YOUR_AUD_TAG"
```

### 2. Build and run

```bash
make build    # installs npm deps, builds React, compiles Go binary
./bin/cloudflare-tunnel-ui
```

Open `http://localhost:8080`.

---

## Configuration Reference

All values can also be set via environment variables with the prefix `CF_TUNNEL_UI_` (e.g. `CF_TUNNEL_UI_SERVER_PORT=9090`).

| Key | Default | Description |
|-----|---------|-------------|
| `server.host` | `0.0.0.0` | Listen address |
| `server.port` | `8080` | HTTP port |
| `server.debug` | `false` | Verbose logging |
| `cloudflare.api_token` | *(required)* | Cloudflare API token |
| `cloudflare.account_id` | *(required)* | Cloudflare account ID |
| `auth.cloudflare_access.enabled` | `false` | Require CF Access JWT |
| `auth.cloudflare_access.team_domain` |  -  | `<team>.cloudflareaccess.com` |
| `auth.cloudflare_access.audience` |  -  | Application AUD tag |
| `auth.cloudflare_access.skip_verification` | `false` | Disable JWT checks (dev only) |

### Required API token permissions

When creating the token in the Cloudflare dashboard, grant:

- **Account** > Cloudflare Tunnel > Edit  
- **Account** > Zero Trust > Edit  
- **Zone** > DNS > Edit  
- **Zone** > Zone > Read

---

## Cloudflare Access Setup (production)

1. In **Zero Trust -> Access -> Applications**, create a Self-hosted application.  
   - Set the application domain to the URL where you'll host the UI (e.g. `cf-ui.example.com`).  
   - Add an Access Policy (e.g. allow by email or identity provider group).
2. Copy the **Audience (AUD) Tag** from the application overview.
3. Set in `config.yaml`:

   ```yaml
   auth:
     cloudflare_access:
       enabled: true
       team_domain: "yourteam.cloudflareaccess.com"
       audience: "<paste AUD tag here>"
   ```

4. Point a Cloudflare Tunnel ingress rule at `http://localhost:8080` and publish the hostname.

Cloudflare Access will intercept unauthenticated requests and redirect users to your identity provider. Once authenticated, CF Access sets the `CF_Authorization` cookie, which the Go middleware validates against your team's public JWKS endpoint.

---

## Development

### Backend

```bash
# Run the Go server (serves the pre-built frontend from cmd/server/web/dist)
go run ./cmd/server
```

Set `CF_TUNNEL_UI_WEB_DIR=cmd/server/web/dist` (or any directory) to serve the frontend from disk instead of the embedded FS:

```bash
CF_TUNNEL_UI_WEB_DIR=cmd/server/web/dist go run ./cmd/server
```

Set `auth.cloudflare_access.enabled: false` (the default) to bypass JWT validation during development.

### Frontend

```bash
cd web
npm install
npm run dev     # Vite dev server on http://localhost:5173
                # /api calls are proxied to http://localhost:8080
```

Vite automatically proxies `/api` requests to the Go backend, so you can run both together for full hot-module-reload (HMR) development.

### Build

```bash
make build-web   # only rebuild frontend
make build       # rebuild frontend + compile Go binary
make build-go    # only compile Go binary (skip frontend)
make test        # run Go tests
make tidy        # tidy go.mod / go.sum
make clean       # remove bin/ and built assets
```

---

## API Endpoints

All endpoints are under `/api` and require a valid CF Access JWT (when `auth.cloudflare_access.enabled: true`).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/me` | Current user info from CF Access token |
| GET | `/api/zones` | List Cloudflare zones |
| GET | `/api/zones/:zoneId/dns` | List DNS records in a zone |
| POST | `/api/zones/:zoneId/dns` | Create a DNS record |
| DELETE | `/api/zones/:zoneId/dns/:recordId` | Delete a DNS record |
| GET | `/api/tunnels` | List all tunnels |
| POST | `/api/tunnels` | Create a tunnel |
| GET | `/api/tunnels/:id` | Get tunnel details |
| DELETE | `/api/tunnels/:id` | Delete a tunnel |
| GET | `/api/tunnels/:id/token` | Get tunnel run token |
| GET | `/api/tunnels/:id/config` | Get tunnel ingress config |
| PUT | `/api/tunnels/:id/config` | Replace full tunnel config |
| POST | `/api/tunnels/:id/ingress` | Add a hostname ingress rule |
| DELETE | `/api/tunnels/:id/ingress/:hostname` | Remove a hostname ingress rule |
| GET | `/api/routes` | List all private network routes |
| POST | `/api/routes` | Create a private network route |
| DELETE | `/api/routes/:id` | Delete a private network route |
| GET | `/api/tunnels/:id/routes` | List routes for a specific tunnel |

---

## Tech Stack

| Layer | Library | License |
|-------|---------|---------|
| Go HTTP framework | [Echo v4](https://github.com/labstack/echo) | MIT |
| Config | [Viper](https://github.com/spf13/viper) | MIT |
| Logging | [zerolog](https://github.com/rs/zerolog) | MIT |
| JWT/JWKS | [lestrrat-go/jwx v2](https://github.com/lestrrat-go/jwx) | MIT |
| Frontend | [React 18](https://react.dev) | MIT |
| Build tool | [Vite 6](https://vitejs.dev) | MIT |
| CSS | [Tailwind CSS v4](https://tailwindcss.com) | MIT |
| Data fetching | [TanStack Query v5](https://tanstack.com/query) | MIT |
| Routing | [React Router v7](https://reactrouter.com) | MIT |
| Icons | [Lucide React](https://lucide.dev) | ISC |
| Toasts | [Sonner](https://sonner.emilkowal.ski) | MIT |

---

## License

MIT

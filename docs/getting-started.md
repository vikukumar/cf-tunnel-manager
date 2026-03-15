---
title: Getting Started
layout: default
nav_order: 2
---

# Getting Started
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Prerequisites

- A **Cloudflare account** with at least one zone
- A **Cloudflare API token** with the following permissions:
  - Account > Cloudflare Tunnel > Edit
  - Zone > DNS > Edit  
  - Account > Zero Trust > Edit
- (Optional) **Cloudflare Access** configured for the UI itself

## Installation

### Docker (Recommended)

```bash
docker run -d \
  --name cloudflare-tunnel-ui \
  -p 8080:8080 \
  -e CF_TUNNEL_UI_CLOUDFLARE_API_TOKEN=your_api_token \
  -e CF_TUNNEL_UI_CLOUDFLARE_ACCOUNT_ID=your_account_id \
  -e CF_TUNNEL_UI_CLOUDFLARE_EMAIL=your@email.com \
  ghcr.io/vikukumar/cf-tunnel-manager:latest
```

### Docker Compose

```yaml
services:
  cloudflare-tunnel-ui:
    image: ghcr.io/vikukumar/cf-tunnel-manager:latest
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      CF_TUNNEL_UI_CLOUDFLARE_API_TOKEN: "${CF_API_TOKEN}"
      CF_TUNNEL_UI_CLOUDFLARE_ACCOUNT_ID: "${CF_ACCOUNT_ID}"
      CF_TUNNEL_UI_CLOUDFLARE_EMAIL: "${CF_EMAIL}"
      CF_TUNNEL_UI_SERVER_DEBUG: "false"
```

### Binary Download

Download the latest release for your platform from the [Releases page](https://github.com/vikukumar/cf-tunnel-manager/releases).

```bash
# Linux x86_64
curl -Lo cloudflare-tunnel-ui.tar.gz \
  https://github.com/vikukumar/cf-tunnel-manager/releases/latest/download/cloudflare-tunnel-ui_Linux_x86_64.tar.gz
tar xzf cloudflare-tunnel-ui.tar.gz

# Create config
cp configs/config.yaml.example configs/config.yaml
# Edit configs/config.yaml ...

./cloudflare-tunnel-ui
```

### Build from Source

```bash
# Requirements: Go 1.23+, Node.js 20+, pnpm
git clone https://github.com/vikukumar/cf-tunnel-manager
cd cf-tunnel-manager

# Copy and edit config
cp configs/config.yaml.example configs/config.yaml

# Full build (frontend + backend)
make build

./bin/cloudflare-tunnel-ui
```

## Configuration

The application reads configuration from `configs/config.yaml` by default. All values can be overridden with environment variables.

```yaml
server:
  host: "0.0.0.0"
  port: 8080
  debug: false

cloudflare:
  api_token: ""          # or env: CF_TUNNEL_UI_CLOUDFLARE_API_TOKEN
  account_id: ""         # or env: CF_TUNNEL_UI_CLOUDFLARE_ACCOUNT_ID  
  email: ""              # or env: CF_TUNNEL_UI_CLOUDFLARE_EMAIL

auth:
  # Cloudflare Access - leave empty to disable
  access_team_domain: "" # e.g. "myteam.cloudflareaccess.com"
  access_aud: ""         # Application AUD from Zero Trust > Access > Applications
```

See the full [Configuration Reference](configuration) for all options.

## Creating Your First Tunnel

1. Open the UI at [http://localhost:8080](http://localhost:8080)
2. Click **New Tunnel** in the sidebar
3. Enter a descriptive name (e.g. `homelab`, `production`)
4. Copy the generated run token
5. Run cloudflared on your server:
   ```bash
   docker run cloudflare/cloudflared:latest tunnel --no-autoupdate run --token <token>
   ```
6. The tunnel status changes to **healthy** once cloudflared connects

## Adding an Application Route

1. Click on your tunnel → **App Routes** tab
2. Click **+ Add Route**
3. Fill in:
   - **Public Hostname**: `app.yourdomain.com`
   - **Protocol**: `http` or `https`
   - **Origin Host**: `localhost` or your service host
   - **Port**: service port (e.g. `8080`)
4. Toggle **Auto-create DNS CNAME** and select your zone
5. Click **Add Route**

Cloudflare will create a proxied CNAME and start routing traffic within seconds.

## Securing the UI with Cloudflare Access

{: .important }
It is strongly recommended to protect the UI with Cloudflare Access to prevent unauthorized access to your Cloudflare account.

1. Create a tunnel pointing to `http://localhost:8080`
2. Add an **Application** in Zero Trust > Access > Applications
3. Set the **Application Domain** to your chosen hostname
4. Copy the **AUD tag** from the application settings
5. Add to your config:
   ```yaml
   auth:
     access_team_domain: "myteam.cloudflareaccess.com"
     access_aud: "<aud-from-access>"
   ```

The server will now validate the `Cf-Access-Jwt-Assertion` header on every request.

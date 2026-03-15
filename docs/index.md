---
title: Home
layout: home
nav_order: 1
---

# Cloudflare Tunnel UI

{: .fs-9 }

A modern, enterprise-grade web UI for managing Cloudflare Tunnels — built with Go + React.

{: .fs-6 .fw-300 }

[Get started](getting-started){: .btn .btn-primary .fs-5 .mb-4 .mb-md-0 .mr-2 }
[View on GitHub](https://github.com/vikukumar/cf-tunnel-manager){: .btn .fs-5 .mb-4 .mb-md-0 }

---

## Features

| Feature | Description |
|---------|-------------|
| 🌐 **App Routes** | Publish local services to the internet with drag-drop ordering, inline editing, and domain grouping |
| 🔒 **Network Routes** | Add private CIDR ranges for Zero Trust WARP users with live CIDR validation |
| 📊 **Live Logs** | Stream cloudflared logs directly in the browser with level filtering and search |
| 🌑 **Dark Mode** | Full dark/light theme toggle with OS preference detection |
| 🔍 **Global Search** | Ctrl+K search overlay for quick navigation |
| 🖥️ **Connector Details** | See connected cloudflared instances with public IP, reverse-DNS hostname, version, and uptime |
| 🐳 **Docker Ready** | Multi-arch Docker images published to GHCR |
| ⚡ **Single Binary** | Embeds the React SPA — one binary, zero dependencies |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Browser (React SPA)                          │
│   TanStack Query · React Router · Tailwind CSS v4 · Lucide      │
└──────────────────────────────┬──────────────────────────────────┘
                               │ REST + SSE
┌──────────────────────────────▼──────────────────────────────────┐
│               Go HTTP Server (Echo v4)                           │
│   Cloudflare Access JWT Auth · zerolog · embedded React dist     │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS
┌──────────────────────────────▼──────────────────────────────────┐
│               Cloudflare API & Management API                    │
│   Tunnels · DNS · Routes · Live logs (WebSocket relay)           │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Using Docker (recommended)
docker run -p 8080:8080 \
  -e CF_TUNNEL_UI_CLOUDFLARE_API_TOKEN=your_token \
  -e CF_TUNNEL_UI_CLOUDFLARE_ACCOUNT_ID=your_account_id \
  ghcr.io/vikukumar/cf-tunnel-manager:latest

# From source
git clone https://github.com/vikukumar/cf-tunnel-manager
cd cf-tunnel-manager
cp configs/config.yaml.example configs/config.yaml
# Edit configs/config.yaml with your Cloudflare credentials
make build
./bin/cloudflare-tunnel-ui
```

Visit [http://localhost:8080](http://localhost:8080)

{: .note }
See [Getting Started](getting-started) for a full walkthrough including Cloudflare Access configuration.

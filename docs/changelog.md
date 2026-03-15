---
title: Changelog
layout: default
nav_order: 99
---

# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

> Releases are created automatically by [release-please](https://github.com/googleapis/release-please) via Conventional Commits.
> `fix:` → patch · `feat:` → minor · `feat!:` / `BREAKING CHANGE:` → major

---

## [1.0.0] - 2026-03-15

### Added

- Go backend (Echo v4) + React 18 SPA (Vite + Tailwind CSS v4)
- Manage Cloudflare Tunnels: create, delete, list, get
- App Routes (ingress rules) with drag-drop reorder, inline edit, domain grouping, auto-arrange
- Network Routes with CIDR validation and host-count display
- Live log streaming via SSE relay to cloudflared management WebSocket (`start_session` handshake)
- Default error/catch-all rule configurator
- WARP routing toggle
- Run token reveal with Docker/Linux run command copy
- Cloudflare Access JWT validation middleware
- Single-binary deployment with embedded React dist
- GitHub Actions CI/CD: lint, test, multi-OS build matrix, Trivy security scan
- GoReleaser multi-platform releases + Docker GHCR images
- GitHub Pages documentation site (Jekyll + just-the-docs)
- Build-time version injection via `-ldflags` (`internal/version` package)
- Reverse-DNS PTR hostname enrichment for connected connectors
- Connector details panel: public IP, PTR hostname, client version, uptime, colo

### Fixed

- Add Application Route modal now renders via React portal (correct full-screen overlay)
- Route edit now uses `PUT /config` (single atomic update) instead of delete + re-add
- Port field is optional for host:port protocol (supports hostname-only origins)
- Tunnel logs: send `start_session` WebSocket message so cloudflared starts emitting events

[Unreleased]: https://github.com/vikukumar/cf-tunnel-manager/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/vikukumar/cf-tunnel-manager/releases/tag/v1.0.0

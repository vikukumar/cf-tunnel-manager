---
title: Deployment
layout: default
nav_order: 4
---

# Deployment
{: .no_toc }

## Table of contents
{: .no_toc .text-delta }

1. TOC
{:toc}

---

## Docker (Production)

### Single Container

```bash
docker run -d \
  --name cf-tunnel-ui \
  --restart unless-stopped \
  -p 127.0.0.1:8080:8080 \
  -e CF_TUNNEL_UI_CLOUDFLARE_API_TOKEN="${CF_API_TOKEN}" \
  -e CF_TUNNEL_UI_CLOUDFLARE_ACCOUNT_ID="${CF_ACCOUNT_ID}" \
  -e CF_TUNNEL_UI_CLOUDFLARE_EMAIL="${CF_EMAIL}" \
  -e CF_TUNNEL_UI_AUTH_ACCESS_TEAM_DOMAIN="${CF_TEAM_DOMAIN}" \
  -e CF_TUNNEL_UI_AUTH_ACCESS_AUD="${CF_ACCESS_AUD}" \
  ghcr.io/vikukumar/cf-tunnel-manager:latest
```

### Docker Compose with Cloudflare Tunnel proxy

```yaml
# docker-compose.yml
services:
  cf-tunnel-ui:
    image: ghcr.io/vikukumar/cf-tunnel-manager:latest
    restart: unless-stopped
    environment:
      CF_TUNNEL_UI_CLOUDFLARE_API_TOKEN: "${CF_API_TOKEN}"
      CF_TUNNEL_UI_CLOUDFLARE_ACCOUNT_ID: "${CF_ACCOUNT_ID}"
      CF_TUNNEL_UI_CLOUDFLARE_EMAIL: "${CF_EMAIL}"
      CF_TUNNEL_UI_AUTH_ACCESS_TEAM_DOMAIN: "${CF_TEAM_DOMAIN}"
      CF_TUNNEL_UI_AUTH_ACCESS_AUD: "${CF_ACCESS_AUD}"
    # Do NOT expose port publicly — tunnel will handle ingress
    expose:
      - "8080"

  cloudflared:
    image: cloudflare/cloudflared:latest
    restart: unless-stopped
    command: tunnel --no-autoupdate run --token ${CLOUDFLARED_TOKEN}
    depends_on:
      - cf-tunnel-ui
```

## Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cf-tunnel-ui
  labels:
    app: cf-tunnel-ui
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cf-tunnel-ui
  template:
    metadata:
      labels:
        app: cf-tunnel-ui
    spec:
      containers:
        - name: cf-tunnel-ui
          image: ghcr.io/vikukumar/cf-tunnel-manager:latest
          ports:
            - containerPort: 8080
          env:
            - name: CF_TUNNEL_UI_CLOUDFLARE_API_TOKEN
              valueFrom:
                secretKeyRef:
                  name: cf-secrets
                  key: api-token
            - name: CF_TUNNEL_UI_CLOUDFLARE_ACCOUNT_ID
              valueFrom:
                secretKeyRef:
                  name: cf-secrets
                  key: account-id
            - name: CF_TUNNEL_UI_CLOUDFLARE_EMAIL
              valueFrom:
                secretKeyRef:
                  name: cf-secrets
                  key: email
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "256Mi"
              cpu: "500m"
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 20
---
apiVersion: v1
kind: Service
metadata:
  name: cf-tunnel-ui
spec:
  selector:
    app: cf-tunnel-ui
  ports:
    - port: 8080
      targetPort: 8080
```

## Systemd (Linux)

```ini
# /etc/systemd/system/cf-tunnel-ui.service
[Unit]
Description=Cloudflare Tunnel UI
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=nobody
Group=nobody
WorkingDirectory=/opt/cf-tunnel-ui
ExecStart=/opt/cf-tunnel-ui/cloudflare-tunnel-ui
Restart=on-failure
RestartSec=5s
EnvironmentFile=/etc/cf-tunnel-ui/env

# Hardening
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ReadWritePaths=/opt/cf-tunnel-ui

[Install]
WantedBy=multi-user.target
```

```bash
# /etc/cf-tunnel-ui/env
CF_TUNNEL_UI_CLOUDFLARE_API_TOKEN=your_token
CF_TUNNEL_UI_CLOUDFLARE_ACCOUNT_ID=your_id
CF_TUNNEL_UI_CLOUDFLARE_EMAIL=you@example.com

# Enable service
sudo systemctl daemon-reload
sudo systemctl enable --now cf-tunnel-ui
```

## Available Docker Tags

| Tag pattern | Description |
|------------|-------------|
| `latest` | Latest stable release from `main` |
| `v1`, `v1.2`, `v1.2.3` | Specific versions |
| `sha-abc1234` | Specific Git commit |

```bash
# Pull specific version
docker pull ghcr.io/vikukumar/cf-tunnel-manager:v1.0.0

# Check available tags
docker pull ghcr.io/vikukumar/cf-tunnel-manager:latest
```

## Security Considerations

{: .important }

- **Never** expose port 8080 directly to the internet without authentication
- Use **Cloudflare Access** to protect the UI (see [Getting Started](getting-started#securing-the-ui-with-cloudflare-access))
- Store API tokens in secrets management (Kubernetes Secrets, Vault, etc.)
- Run as non-root user — the Docker image uses `nonroot:nonroot`
- The binary has no setuid bits and drops all capabilities at startup

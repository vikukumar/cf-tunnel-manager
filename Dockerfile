# ─── Stage 1: Build frontend ──────────────────────────────────────────────────
FROM node:25-alpine AS frontend
WORKDIR /app/web

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY web/package.json web/pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY web/ ./
RUN pnpm run build

# ─── Stage 2: Build Go binary ─────────────────────────────────────────────────
FROM golang:1.26-alpine AS builder

ARG VERSION=dev
ARG COMMIT=unknown
ARG BUILDDATE=unknown

ENV CGO_ENABLED=0
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
# Copy built frontend so the Go embed picks it up
COPY --from=frontend /app/cmd/server/web/dist ./cmd/server/web/dist

RUN go build \
    -ldflags="-s -w \
      -X 'github.com/vikukumar/cf-tunnel-manager/internal/version.Version=${VERSION}' \
      -X 'github.com/vikukumar/cf-tunnel-manager/internal/version.Commit=${COMMIT}' \
      -X 'github.com/vikukumar/cf-tunnel-manager/internal/version.BuildDate=${BUILDDATE}'" \
    -o /bin/cloudflare-tunnel-ui ./cmd/server

# ─── Stage 3: Minimal runtime image ──────────────────────────────────────────
FROM gcr.io/distroless/static-debian12:nonroot

LABEL org.opencontainers.image.title="Cloudflare Tunnel UI" \
      org.opencontainers.image.description="Web UI for managing Cloudflare Tunnels" \
      org.opencontainers.image.url="https://github.com/vikukumar/cf-tunnel-manager" \
      org.opencontainers.image.source="https://github.com/vikukumar/cf-tunnel-manager" \
      org.opencontainers.image.licenses="MIT"

COPY --from=builder /bin/cloudflare-tunnel-ui /cloudflare-tunnel-ui

# Default config location — mount a config file or use env vars
ENV CF_TUNNEL_UI_SERVER_PORT=8080 \
    CF_TUNNEL_UI_SERVER_HOST=0.0.0.0

EXPOSE 8080

USER nonroot:nonroot
ENTRYPOINT ["/cloudflare-tunnel-ui"]

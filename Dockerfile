# ─── Stage 1: Build Go binary ─────────────────────────────────────────────────
# The frontend (cmd/server/web/dist/) is pre-built by CI and present in the
# build context, so no Node stage is needed here.
FROM golang:1.26-alpine AS builder

ARG VERSION=dev
ARG COMMIT=unknown
ARG BUILDDATE=unknown

ENV CGO_ENABLED=0
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build \
    -ldflags="-s -w \
      -X 'github.com/vikukumar/cf-tunnel-manager/internal/version.Version=${VERSION}' \
      -X 'github.com/vikukumar/cf-tunnel-manager/internal/version.Commit=${COMMIT}' \
      -X 'github.com/vikukumar/cf-tunnel-manager/internal/version.BuildDate=${BUILDDATE}'" \
    -o /bin/cloudflare-tunnel-ui ./cmd/server

# ─── Stage 2: Minimal runtime image ──────────────────────────────────────────
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

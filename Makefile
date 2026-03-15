.PHONY: all build build-web run dev clean test tidy lint version

BINARY_NAME := cloudflare-tunnel-ui
BIN_DIR     := bin
WEB_DIR     := web
GO_CMD      := go
NPM_CMD     := pnpm

# Detect OS for binary extension
ifeq ($(OS),Windows_NT)
  BINARY_EXT := .exe
else
  BINARY_EXT :=
endif

BINARY := $(BIN_DIR)/$(BINARY_NAME)$(BINARY_EXT)

# Version info injected at build time
VERSION   ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
COMMIT    ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BUILDDATE ?= $(shell date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo "unknown")
PKG       := github.com/vikukumar/cf-tunnel-manager/internal/version
LDFLAGS   := -X '$(PKG).Version=$(VERSION)' -X '$(PKG).Commit=$(COMMIT)' -X '$(PKG).BuildDate=$(BUILDDATE)'

# ─── Default target ──────────────────────────────────────────────────────────
all: build

# ─── Build ───────────────────────────────────────────────────────────────────

## build-web: Install frontend dependencies and build the React app.
## Output goes to cmd/server/web/dist so the Go embed picks it up.
build-web:
	@echo ">>> Installing frontend dependencies..."
	cd $(WEB_DIR) && $(NPM_CMD) install
	@echo ">>> Building frontend..."
	cd $(WEB_DIR) && $(NPM_CMD) run build

## build: Compile the Go binary (runs build-web first).
build: build-web
	@echo ">>> Building Go binary ($(VERSION))..."
	@mkdir -p $(BIN_DIR)
	$(GO_CMD) build -ldflags="$(LDFLAGS)" -o $(BINARY) ./cmd/server

## build-go: Compile the Go binary without rebuilding the frontend.
build-go:
	@echo ">>> Building Go binary (skipping frontend)..."
	@mkdir -p $(BIN_DIR)
	$(GO_CMD) build -ldflags="$(LDFLAGS)" -o $(BINARY) ./cmd/server

## version: Print the resolved version info.
version:
	@echo "Version:   $(VERSION)"
	@echo "Commit:    $(COMMIT)"
	@echo "BuildDate: $(BUILDDATE)"

# ─── Run ─────────────────────────────────────────────────────────────────────

## run: Build everything and run the server using configs/config.yaml.
run: build
	@echo ">>> Starting server..."
	./$(BINARY)

## run-go: Run the Go server without rebuilding the frontend.
## Set CF_TUNNEL_UI_WEB_DIR to serve the frontend from disk.
run-go: build-go
	@echo ">>> Starting server (Go only)..."
	CF_TUNNEL_UI_WEB_DIR=cmd/server/web/dist ./$(BINARY)

# ─── Development ─────────────────────────────────────────────────────────────

## dev: Run the Go backend and Vite dev server concurrently.
## The Go server serves the API; Vite proxies /api to Go and HMR reloads the UI.
## Requires the 'concurrently' package or two terminals.
dev:
	@echo ">>> Starting Go backend in dev mode..."
	@echo ">>> In a second terminal run: cd web && npm run dev"
	CF_TUNNEL_UI_WEB_DIR=cmd/server/web/dist \
		$(GO_CMD) run ./cmd/server

## dev-web: Start only the Vite dev server (requires Go backend to be running).
dev-web:
	cd $(WEB_DIR) && $(NPM_CMD) run dev

# ─── Utilities ───────────────────────────────────────────────────────────────

## tidy: Tidy Go modules and sync go.sum.
tidy:
	$(GO_CMD) mod tidy

## test: Run Go unit tests.
test:
	$(GO_CMD) test ./...

## lint: Run golangci-lint (must be installed separately).
lint:
	golangci-lint run ./...

## clean: Remove build artifacts.
clean:
	@echo ">>> Cleaning build artifacts..."
	rm -rf $(BIN_DIR)
	rm -rf cmd/server/web/dist
	rm -rf $(WEB_DIR)/node_modules

## help: Print this help message.
help:
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/^## //'

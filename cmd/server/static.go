package main

import (
	"embed"
	"io/fs"
	"os"

	"github.com/rs/zerolog/log"
)

// webDist is the embedded React build output.
// Run `make build-web` before `go build` to populate this directory.
//
//go:embed web/dist
var webDist embed.FS

// staticFS returns the filesystem to serve the frontend from.
// If the environment variable CF_TUNNEL_UI_WEB_DIR is set it serves from disk
// instead of the embedded FS (useful for hot-reload during development).
func staticFS() fs.FS {
	if dir := os.Getenv("CF_TUNNEL_UI_WEB_DIR"); dir != "" {
		log.Info().Str("dir", dir).Msg("Serving frontend from disk (dev mode)")
		return os.DirFS(dir)
	}
	sub, err := fs.Sub(webDist, "web/dist")
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to access embedded frontend assets")
	}
	return sub
}

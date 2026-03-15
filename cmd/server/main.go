package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/vikukumar/cf-tunnel-manager/internal/api"
	"github.com/vikukumar/cf-tunnel-manager/internal/config"
	"github.com/vikukumar/cf-tunnel-manager/internal/version"
)

func main() {
	// Pretty console logging during startup.
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr, TimeFormat: time.RFC3339})

	log.Info().Str("version", version.Version).Str("commit", version.Commit).Str("built", version.BuildDate).Msg("cloudflare-tunnel-ui starting")

	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to load configuration")
	}

	if cfg.Server.Debug {
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
		log.Debug().Msg("Debug logging enabled")
	} else {
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}

	server := api.NewServer(cfg, staticFS())

	// Run server in a goroutine so we can listen for shutdown signals.
	go func() {
		if err := server.Start(); err != nil {
			// ErrServerClosed is expected on graceful shutdown.
			log.Info().Err(err).Msg("HTTP server stopped")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("Received shutdown signal")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Error().Err(err).Msg("Graceful shutdown error")
	}
	log.Info().Msg("Server exited cleanly")
}

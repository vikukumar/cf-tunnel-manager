package api

import (
	"context"
	"fmt"
	"io/fs"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
	echomiddleware "github.com/labstack/echo/v4/middleware"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/vikukumar/cf-tunnel-manager/internal/api/handlers"
	apimw "github.com/vikukumar/cf-tunnel-manager/internal/api/middleware"
	"github.com/vikukumar/cf-tunnel-manager/internal/cfapi"
	"github.com/vikukumar/cf-tunnel-manager/internal/config"
)

// Server wraps Echo and all dependencies.
type Server struct {
	echo   *echo.Echo
	cfg    *config.Config
	logger zerolog.Logger
}

// noopValidator is a pass-through so Echo validation does not panic when struct validation is skipped.
type noopValidator struct{}

func (noopValidator) Validate(interface{}) error { return nil }

// NewServer wires up all routes and middleware.
func NewServer(cfg *config.Config, staticFS fs.FS) *Server {
	e := echo.New()
	e.HideBanner = true
	e.HidePort = true
	e.Validator = noopValidator{}

	logger := log.With().Str("component", "api").Logger()

	// --- Global middleware ------------------------------------------------------
	e.Use(echomiddleware.Recover())
	e.Use(echomiddleware.RequestLoggerWithConfig(echomiddleware.RequestLoggerConfig{
		LogURI:    true,
		LogStatus: true,
		LogMethod: true,
		LogError:  true,
		LogValuesFunc: func(c echo.Context, v echomiddleware.RequestLoggerValues) error {
			if v.Error != nil {
				logger.Error().Err(v.Error).Str("method", v.Method).Str("uri", v.URI).Int("status", v.Status).Msg("request")
			} else {
				logger.Debug().Str("method", v.Method).Str("uri", v.URI).Int("status", v.Status).Msg("request")
			}
			return nil
		},
	}))
	e.Use(echomiddleware.CORSWithConfig(echomiddleware.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions},
		AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAuthorization},
	}))

	// --- CF Access middleware (applied only to /api/* routes) ------------------
	var authMW echo.MiddlewareFunc
	if cfg.Auth.CloudflareAccess.Enabled {
		authMW = apimw.CFAccessAuth(apimw.CFAccessAuthConfig{
			TeamDomain:       cfg.Auth.CloudflareAccess.TeamDomain,
			Audience:         cfg.Auth.CloudflareAccess.Audience,
			SkipVerification: cfg.Auth.CloudflareAccess.SkipVerification,
		})
		logger.Info().Str("team_domain", cfg.Auth.CloudflareAccess.TeamDomain).Msg("Cloudflare Access auth enabled")
	} else {
		// Auth disabled: use a no-op middleware that injects a dev user.
		authMW = apimw.CFAccessAuth(apimw.CFAccessAuthConfig{SkipVerification: true})
		logger.Warn().Msg("Cloudflare Access auth is disabled  -  all requests are unauthenticated")
	}

	// --- Service layer ----------------------------------------------------------
	cf := cfapi.New(cfg.Cloudflare.APIToken, cfg.Cloudflare.AccountID, logger)

	// --- API route group --------------------------------------------------------
	api := e.Group("/api", authMW)

	// Auth
	api.GET("/auth/me", handlers.Me)

	// Zones
	zoneHandler := handlers.NewZoneHandler(cf, logger)
	api.GET("/zones", zoneHandler.ListZones)

	// DNS Records
	dnsHandler := handlers.NewDNSHandler(cf, logger)
	api.GET("/zones/:zoneId/dns", dnsHandler.ListRecords)
	api.POST("/zones/:zoneId/dns", dnsHandler.CreateRecord)
	api.DELETE("/zones/:zoneId/dns/:recordId", dnsHandler.DeleteRecord)

	// Tunnels
	tunnelHandler := handlers.NewTunnelHandler(cf, logger)
	api.GET("/tunnels", tunnelHandler.List)
	api.POST("/tunnels", tunnelHandler.Create)
	api.GET("/tunnels/:id", tunnelHandler.Get)
	api.DELETE("/tunnels/:id", tunnelHandler.Delete)
	api.GET("/tunnels/:id/token", tunnelHandler.GetToken)
	api.GET("/tunnels/:id/config", tunnelHandler.GetConfig)
	api.PUT("/tunnels/:id/config", tunnelHandler.UpdateConfig)
	api.POST("/tunnels/:id/ingress", tunnelHandler.AddIngress)
	api.DELETE("/tunnels/:id/ingress/:hostname", tunnelHandler.RemoveIngress)
	api.PUT("/tunnels/:id/warp-routing", tunnelHandler.UpdateWarpRouting)
	api.GET("/tunnels/:id/logs", tunnelHandler.StreamLogs)

	// Private network routes
	routeHandler := handlers.NewRouteHandler(cf, logger)
	api.GET("/routes", routeHandler.List)
	api.POST("/routes", routeHandler.Create)
	api.DELETE("/routes/:id", routeHandler.Delete)
	api.GET("/tunnels/:id/routes", routeHandler.ListByTunnel)

	// --- Static frontend serving -------------------------------------------------
	fileServer := http.FileServer(http.FS(staticFS))
	e.GET("/*", func(c echo.Context) error {
		path := c.Request().URL.Path
		// API requests must not fall through to the static handler.
		if strings.HasPrefix(path, "/api/") {
			return echo.ErrNotFound
		}

		// Map "/" -> "." so fs.Stat works; any other path drops the leading slash.
		name := strings.TrimPrefix(path, "/")
		if name == "" {
			name = "."
		}

		if _, err := fs.Stat(staticFS, name); err != nil {
			// Unknown path  -  SPA fallback. Rewrite to "/" so http.FileServer
			// serves index.html from the embedded FS (handles React Router routes).
			if _, idxErr := fs.Stat(staticFS, "index.html"); idxErr != nil {
				return echo.NewHTTPError(http.StatusServiceUnavailable,
					"Frontend not built. Run 'make build-web' first.")
			}
			c.Request().URL.Path = "/"
		}

		fileServer.ServeHTTP(c.Response(), c.Request())
		return nil
	})

	return &Server{echo: e, cfg: cfg, logger: logger}
}

// Start begins listening for HTTP connections.
func (s *Server) Start() error {
	addr := fmt.Sprintf("%s:%d", s.cfg.Server.Host, s.cfg.Server.Port)
	s.logger.Info().Str("addr", addr).Msg("Starting HTTP server")
	return s.echo.Start(addr)
}

// Shutdown gracefully stops the server.
func (s *Server) Shutdown(ctx context.Context) error {
	s.logger.Info().Msg("Shutting down HTTP server")
	return s.echo.Shutdown(ctx)
}

package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	"github.com/labstack/echo/v4"
	"github.com/rs/zerolog"

	"github.com/vikukumar/cf-tunnel-manager/internal/api/middleware"
	"github.com/vikukumar/cf-tunnel-manager/internal/cfapi"
)

// TunnelHandler handles all tunnel-related API endpoints.
type TunnelHandler struct {
	cf     *cfapi.Service
	logger zerolog.Logger
}

// NewTunnelHandler creates a handler with the given CF service.
func NewTunnelHandler(cf *cfapi.Service, logger zerolog.Logger) *TunnelHandler {
	return &TunnelHandler{cf: cf, logger: logger}
}

// List returns all tunnels in the account.
// GET /api/tunnels
func (h *TunnelHandler) List(c echo.Context) error {
	tunnels, err := h.cf.ListTunnels(c.Request().Context())
	if err != nil {
		return apiError(c, http.StatusBadGateway, "Failed to list tunnels", err)
	}
	return c.JSON(http.StatusOK, successResponse(tunnels))
}

// Get returns a single tunnel with its connections.
// GET /api/tunnels/:id
func (h *TunnelHandler) Get(c echo.Context) error {
	id := c.Param("id")
	tunnel, err := h.cf.GetTunnel(c.Request().Context(), id)
	if err != nil {
		return apiError(c, http.StatusBadGateway, "Failed to get tunnel", err)
	}
	return c.JSON(http.StatusOK, successResponse(tunnel))
}

// Create creates a new remotely-managed cloudflared tunnel.
// POST /api/tunnels
func (h *TunnelHandler) Create(c echo.Context) error {
	var body struct {
		Name string `json:"name" validate:"required"`
	}
	if err := bindAndValidate(c, &body); err != nil {
		return err
	}

	tunnel, err := h.cf.CreateTunnel(c.Request().Context(), body.Name)
	if err != nil {
		return apiError(c, http.StatusBadGateway, "Failed to create tunnel", err)
	}
	return c.JSON(http.StatusCreated, successResponse(tunnel))
}

// Delete deletes a tunnel.
// DELETE /api/tunnels/:id
func (h *TunnelHandler) Delete(c echo.Context) error {
	id := c.Param("id")
	if err := h.cf.DeleteTunnel(c.Request().Context(), id); err != nil {
		return apiError(c, http.StatusBadGateway, "Failed to delete tunnel", err)
	}
	return c.JSON(http.StatusOK, successResponse(map[string]string{"id": id}))
}

// GetToken returns the cloudflared run token for a tunnel.
// GET /api/tunnels/:id/token
func (h *TunnelHandler) GetToken(c echo.Context) error {
	id := c.Param("id")
	token, err := h.cf.GetTunnelToken(c.Request().Context(), id)
	if err != nil {
		return apiError(c, http.StatusBadGateway, "Failed to get tunnel token", err)
	}
	return c.JSON(http.StatusOK, successResponse(map[string]string{"token": token}))
}

// GetConfig returns the ingress & routing config for a tunnel.
// GET /api/tunnels/:id/config
func (h *TunnelHandler) GetConfig(c echo.Context) error {
	id := c.Param("id")
	cfg, err := h.cf.GetTunnelConfig(c.Request().Context(), id)
	if err != nil {
		return apiError(c, http.StatusBadGateway, "Failed to get tunnel config", err)
	}
	return c.JSON(http.StatusOK, successResponse(cfg))
}

// UpdateConfig replaces the entire ingress configuration for a tunnel.
// PUT /api/tunnels/:id/config
func (h *TunnelHandler) UpdateConfig(c echo.Context) error {
	id := c.Param("id")
	var body cfapi.TunnelConfigBody
	if err := bindAndValidate(c, &body); err != nil {
		return err
	}

	cfg, err := h.cf.UpdateTunnelConfig(c.Request().Context(), id, body)
	if err != nil {
		return apiError(c, http.StatusBadGateway, "Failed to update tunnel config", err)
	}
	return c.JSON(http.StatusOK, successResponse(cfg))
}

// AddIngress adds a hostname ingress rule to a tunnel and creates the DNS CNAME.
// POST /api/tunnels/:id/ingress
func (h *TunnelHandler) AddIngress(c echo.Context) error {
	id := c.Param("id")
	var body struct {
		Hostname      string               `json:"hostname" validate:"required"`
		Service       string               `json:"service" validate:"required"`
		Path          string               `json:"path,omitempty"`
		ZoneID        string               `json:"zone_id"`
		CreateDNS     bool                 `json:"create_dns"`
		OriginRequest *cfapi.OriginRequest `json:"origin_request,omitempty"`
	}
	if err := bindAndValidate(c, &body); err != nil {
		return err
	}

	rule := cfapi.IngressRule{
		Hostname:      body.Hostname,
		Service:       body.Service,
		Path:          body.Path,
		OriginRequest: body.OriginRequest,
	}

	cfg, err := h.cf.AddIngressRule(c.Request().Context(), id, rule)
	if err != nil {
		return apiError(c, http.StatusBadGateway, "Failed to add ingress rule", err)
	}

	// Optionally create the DNS CNAME record.
	if body.CreateDNS && body.ZoneID != "" {
		_, dnsErr := h.cf.CreateTunnelCNAME(c.Request().Context(), body.ZoneID, body.Hostname, id)
		if dnsErr != nil {
			h.logger.Warn().Err(dnsErr).Str("hostname", body.Hostname).Msg("Ingress rule added but DNS CNAME creation failed")
		}
	}

	return c.JSON(http.StatusCreated, successResponse(cfg))
}

// RemoveIngress removes a hostname ingress rule from a tunnel.
// DELETE /api/tunnels/:id/ingress/:hostname
func (h *TunnelHandler) RemoveIngress(c echo.Context) error {
	id := c.Param("id")
	hostname := c.Param("hostname")

	cfg, err := h.cf.RemoveIngressRule(c.Request().Context(), id, hostname)
	if err != nil {
		return apiError(c, http.StatusBadGateway, "Failed to remove ingress rule", err)
	}
	return c.JSON(http.StatusOK, successResponse(cfg))
}

// Me returns information about the currently authenticated user.
// GET /api/auth/me
func Me(c echo.Context) error {
	user := middleware.GetUserInfo(c)
	if user == nil {
		return c.JSON(http.StatusOK, successResponse(map[string]string{
			"email": "anonymous",
			"sub":   "",
		}))
	}
	return c.JSON(http.StatusOK, successResponse(map[string]string{
		"email": user.Email,
		"sub":   user.Sub,
	}))
}

// UpdateWarpRouting enables or disables WARP routing for a tunnel.
// PUT /api/tunnels/:id/warp-routing
func (h *TunnelHandler) UpdateWarpRouting(c echo.Context) error {
	id := c.Param("id")
	var body struct {
		Enabled bool `json:"enabled"`
	}
	if err := bindAndValidate(c, &body); err != nil {
		return err
	}
	cfg, err := h.cf.UpdateWarpRouting(c.Request().Context(), id, body.Enabled)
	if err != nil {
		return apiError(c, http.StatusBadGateway, "Failed to update WARP routing", err)
	}
	return c.JSON(http.StatusOK, successResponse(cfg))
}

// StreamLogs streams live cloudflared logs for a tunnel as Server-Sent Events.
// It obtains a management token from the Cloudflare API, opens a WebSocket
// connection to the management endpoint, and relays each JSON log message to
// the client as an SSE data event.
// GET /api/tunnels/:id/logs
func (h *TunnelHandler) StreamLogs(c echo.Context) error {
	id := c.Param("id")
	log := h.logger.With().Str("tunnel", id).Logger()
	log.Info().Msg("starting live log stream")

	// Set SSE headers before writing any body.
	c.Response().Header().Set(echo.HeaderContentType, "text/event-stream")
	c.Response().Header().Set("Cache-Control", "no-cache")
	c.Response().Header().Set("Connection", "keep-alive")
	c.Response().Header().Set("X-Accel-Buffering", "no")
	c.Response().WriteHeader(http.StatusOK)
	c.Response().Flush()

	writeEvent := func(event, data string) {
		if event != "" {
			fmt.Fprintf(c.Response(), "event: %s\n", event) //nolint:errcheck
		}
		fmt.Fprintf(c.Response(), "data: %s\n\n", data) //nolint:errcheck
		c.Response().Flush()
	}

	// Get the management URL + embedded token from CF.
	mgmt, err := h.cf.GetManagementToken(c.Request().Context(), id)
	if err != nil {
		log.Error().Err(err).Msg("failed to get management token")
		writeEvent("error", err.Error())
		return nil
	}
	if mgmt.URL == "" {
		log.Error().Msg("management token returned empty URL - tunnel connector may not be running")
		writeEvent("error", "Tunnel management URL is empty - ensure the tunnel connector is running.")
		return nil
	}
	log.Info().Str("host", extractHost(mgmt.URL)).Msg("management token obtained")

	// Fix URL scheme for WebSocket (CF may return https:// or wss://).
	wsURL := strings.NewReplacer(
		"https://", "wss://",
		"http://", "ws://",
	).Replace(mgmt.URL)

	dialer := websocket.Dialer{HandshakeTimeout: 15 * time.Second}
	conn, _, err := dialer.DialContext(c.Request().Context(), wsURL, nil)
	if err != nil {
		log.Error().Err(err).Str("url", extractHost(wsURL)).Msg("failed to dial management WebSocket")
		writeEvent("error", "Cannot connect to tunnel management endpoint: "+err.Error())
		return nil
	}
	defer conn.Close()
	log.Info().Msg("management WebSocket connected, streaming logs")

	// Cloudflared management protocol: send start_session to begin receiving logs.
	startMsg, _ := json.Marshal(map[string]any{
		"version": 1,
		"event":   map[string]any{"type": "start_session"},
	})
	if err := conn.WriteMessage(websocket.TextMessage, startMsg); err != nil {
		log.Error().Err(err).Msg("failed to send start_session")
		writeEvent("error", "Failed to subscribe to log stream: "+err.Error())
		return nil
	}
	log.Info().Msg("start_session sent, waiting for log events")

	type wsMsg struct {
		data []byte
		err  error
	}
	msgCh := make(chan wsMsg, 64)
	go func() {
		for {
			_, msg, err := conn.ReadMessage()
			msgCh <- wsMsg{data: msg, err: err}
			if err != nil {
				return
			}
		}
	}()

	keepalive := time.NewTicker(20 * time.Second)
	defer keepalive.Stop()

	ctx := c.Request().Context()
	for {
		select {
		case <-ctx.Done():
			return nil
		case <-keepalive.C:
			// SSE comment keeps the connection alive through proxies.
			fmt.Fprintf(c.Response(), ": ping\n\n") //nolint:errcheck
			c.Response().Flush()
		case m := <-msgCh:
			if m.err != nil {
				select {
				case <-ctx.Done():
				default:
					log.Error().Err(m.err).Msg("management WebSocket read error")
					writeEvent("error", m.err.Error())
				}
				return nil
			}
			writeEvent("", string(m.data))
		}
	}
}

// extractHost returns just the host part of a URL for safe logging (hides tokens in query string).
func extractHost(rawURL string) string {
	if i := strings.Index(rawURL, "?"); i != -1 {
		return rawURL[:i]
	}
	return rawURL
}

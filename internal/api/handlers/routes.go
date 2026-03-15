package handlers

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/rs/zerolog"

	"github.com/vikukumar/cf-tunnel-manager/internal/cfapi"
)

// RouteHandler handles private network route endpoints.
type RouteHandler struct {
	cf     *cfapi.Service
	logger zerolog.Logger
}

// NewRouteHandler creates a RouteHandler.
func NewRouteHandler(cf *cfapi.Service, logger zerolog.Logger) *RouteHandler {
	return &RouteHandler{cf: cf, logger: logger}
}

// List returns all private network routes for the account.
// GET /api/routes
func (h *RouteHandler) List(c echo.Context) error {
	routes, err := h.cf.ListNetworkRoutes(c.Request().Context())
	if err != nil {
		return apiError(c, http.StatusBadGateway, "Failed to list network routes", err)
	}
	return c.JSON(http.StatusOK, successResponse(routes))
}

// ListByTunnel returns private network routes for a specific tunnel.
// GET /api/tunnels/:id/routes
func (h *RouteHandler) ListByTunnel(c echo.Context) error {
	tunnelID := c.Param("id")
	routes, err := h.cf.ListNetworkRoutesByTunnel(c.Request().Context(), tunnelID)
	if err != nil {
		return apiError(c, http.StatusBadGateway, "Failed to list network routes", err)
	}
	return c.JSON(http.StatusOK, successResponse(routes))
}

// Create adds a private network IP CIDR route.
// POST /api/routes
func (h *RouteHandler) Create(c echo.Context) error {
	var params cfapi.CreateRouteParams
	if err := bindAndValidate(c, &params); err != nil {
		return err
	}
	route, err := h.cf.CreateNetworkRoute(c.Request().Context(), params)
	if err != nil {
		return apiError(c, http.StatusBadGateway, "Failed to create network route", err)
	}
	return c.JSON(http.StatusCreated, successResponse(route))
}

// Delete removes a private network route by ID.
// DELETE /api/routes/:id
func (h *RouteHandler) Delete(c echo.Context) error {
	routeID := c.Param("id")
	if err := h.cf.DeleteNetworkRoute(c.Request().Context(), routeID); err != nil {
		return apiError(c, http.StatusBadGateway, "Failed to delete network route", err)
	}
	return c.JSON(http.StatusOK, successResponse(map[string]string{"id": routeID}))
}

package cfapi

import (
	"context"
	"fmt"
	"time"
)

// NetworkRoute represents a private network IP route through a tunnel.
type NetworkRoute struct {
	ID          string     `json:"id"`
	Network     string     `json:"network"`
	TunnelID    string     `json:"tunnel_id"`
	TunnelName  string     `json:"tunnel_name"`
	Comment     string     `json:"comment,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty"`
}

// CreateRouteParams holds parameters for adding a private network route.
type CreateRouteParams struct {
	Network  string `json:"network"`
	TunnelID string `json:"tunnel_id"`
	Comment  string `json:"comment,omitempty"`
}

// ListNetworkRoutes returns all private network routes for the account.
func (s *Service) ListNetworkRoutes(ctx context.Context) ([]NetworkRoute, error) {
	path := fmt.Sprintf("/accounts/%s/teamnet/routes?is_deleted=false", s.AccountID)
	var routes []NetworkRoute
	if _, err := s.getList(ctx, path, &routes); err != nil {
		return nil, fmt.Errorf("listing network routes: %w", err)
	}
	return routes, nil
}

// ListNetworkRoutesByTunnel returns private network routes for a specific tunnel.
func (s *Service) ListNetworkRoutesByTunnel(ctx context.Context, tunnelID string) ([]NetworkRoute, error) {
	path := fmt.Sprintf("/accounts/%s/teamnet/routes?tunnel_id=%s&is_deleted=false", s.AccountID, tunnelID)
	var routes []NetworkRoute
	if _, err := s.getList(ctx, path, &routes); err != nil {
		return nil, fmt.Errorf("listing network routes for tunnel %s: %w", tunnelID, err)
	}
	return routes, nil
}

// CreateNetworkRoute adds a private network IP CIDR route through a tunnel.
func (s *Service) CreateNetworkRoute(ctx context.Context, params CreateRouteParams) (*NetworkRoute, error) {
	path := fmt.Sprintf("/accounts/%s/teamnet/routes", s.AccountID)
	var route NetworkRoute
	if err := s.post(ctx, path, params, &route); err != nil {
		return nil, fmt.Errorf("creating network route: %w", err)
	}
	return &route, nil
}

// DeleteNetworkRoute removes a private network route by ID.
func (s *Service) DeleteNetworkRoute(ctx context.Context, routeID string) error {
	path := fmt.Sprintf("/accounts/%s/teamnet/routes/%s", s.AccountID, routeID)
	if err := s.delete(ctx, path, nil); err != nil {
		return fmt.Errorf("deleting network route %s: %w", routeID, err)
	}
	return nil
}

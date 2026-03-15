package cfapi

import (
	"context"
	"fmt"
)

// Zone represents a Cloudflare DNS zone.
type Zone struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Status     string `json:"status"`
	Type       string `json:"type"`
	Paused     bool   `json:"paused"`
	Plan       struct {
		Name string `json:"name"`
	} `json:"plan"`
	Account struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	} `json:"account"`
}

// ListZones returns all zones accessible to the configured account.
func (s *Service) ListZones(ctx context.Context) ([]Zone, error) {
	path := fmt.Sprintf("/zones?account.id=%s&status=active&per_page=50", s.AccountID)
	var zones []Zone
	if _, err := s.getList(ctx, path, &zones); err != nil {
		return nil, fmt.Errorf("listing zones: %w", err)
	}
	return zones, nil
}

// GetZone returns a single zone by ID.
func (s *Service) GetZone(ctx context.Context, zoneID string) (*Zone, error) {
	path := fmt.Sprintf("/zones/%s", zoneID)
	var zone Zone
	if err := s.get(ctx, path, &zone); err != nil {
		return nil, fmt.Errorf("getting zone %s: %w", zoneID, err)
	}
	return &zone, nil
}

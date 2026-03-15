package cfapi

import (
	"context"
	"fmt"
	"time"
)

// DNSRecord represents a Cloudflare DNS record.
type DNSRecord struct {
	ID         string     `json:"id"`
	ZoneID     string     `json:"zone_id"`
	ZoneName   string     `json:"zone_name"`
	Name       string     `json:"name"`
	Type       string     `json:"type"`
	Content    string     `json:"content"`
	Proxied    bool       `json:"proxied"`
	TTL        int        `json:"ttl"`
	CreatedOn  time.Time  `json:"created_on"`
	ModifiedOn time.Time  `json:"modified_on"`
	Comment    string     `json:"comment,omitempty"`
}

// CreateDNSRecordParams holds parameters for creating a DNS record.
type CreateDNSRecordParams struct {
	Name    string `json:"name"`
	Type    string `json:"type"`
	Content string `json:"content"`
	Proxied bool   `json:"proxied"`
	TTL     int    `json:"ttl,omitempty"`
	Comment string `json:"comment,omitempty"`
}

// ListDNSRecords returns all DNS records for the given zone.
func (s *Service) ListDNSRecords(ctx context.Context, zoneID string) ([]DNSRecord, error) {
	path := fmt.Sprintf("/zones/%s/dns_records?per_page=100", zoneID)
	var records []DNSRecord
	if _, err := s.getList(ctx, path, &records); err != nil {
		return nil, fmt.Errorf("listing DNS records for zone %s: %w", zoneID, err)
	}
	return records, nil
}

// CreateDNSRecord creates a new DNS record in the given zone.
func (s *Service) CreateDNSRecord(ctx context.Context, zoneID string, params CreateDNSRecordParams) (*DNSRecord, error) {
	if params.TTL == 0 {
		params.TTL = 1 // Automatic TTL
	}
	path := fmt.Sprintf("/zones/%s/dns_records", zoneID)
	var record DNSRecord
	if err := s.post(ctx, path, params, &record); err != nil {
		return nil, fmt.Errorf("creating DNS record: %w", err)
	}
	return &record, nil
}

// DeleteDNSRecord removes a DNS record from a zone.
func (s *Service) DeleteDNSRecord(ctx context.Context, zoneID, recordID string) error {
	path := fmt.Sprintf("/zones/%s/dns_records/%s", zoneID, recordID)
	if err := s.delete(ctx, path, nil); err != nil {
		return fmt.Errorf("deleting DNS record %s: %w", recordID, err)
	}
	return nil
}

// CreateTunnelCNAME creates a proxied CNAME record pointing to the tunnel.
// This is the helper used when adding a new hostname to a tunnel.
func (s *Service) CreateTunnelCNAME(ctx context.Context, zoneID, hostname, tunnelID string) (*DNSRecord, error) {
	return s.CreateDNSRecord(ctx, zoneID, CreateDNSRecordParams{
		Type:    "CNAME",
		Name:    hostname,
		Content: fmt.Sprintf("%s.cfargotunnel.com", tunnelID),
		Proxied: true,
		TTL:     1,
		Comment: fmt.Sprintf("Cloudflare Tunnel: %s", tunnelID),
	})
}

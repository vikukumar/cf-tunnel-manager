package cfapi

import (
	"context"
	"fmt"
	"net"
	"strings"
	"time"
)

// Tunnel represents a Cloudflare Tunnel (cfd_tunnel) resource.
type Tunnel struct {
	ID              string         `json:"id"`
	AccountTag      string         `json:"account_tag"`
	Name            string         `json:"name"`
	Status          string         `json:"status"`
	CreatedAt       time.Time      `json:"created_at"`
	DeletedAt       *time.Time     `json:"deleted_at,omitempty"`
	ConnsActiveAt   *time.Time     `json:"conns_active_at,omitempty"`
	ConnsInactiveAt *time.Time     `json:"conns_inactive_at,omitempty"`
	TunType         string         `json:"tun_type"`
	RemoteConfig    bool           `json:"remote_config"`
	Connections     []TunnelConn   `json:"connections"`
	Metadata        map[string]any `json:"metadata,omitempty"`
}

// TunnelConn represents an active connection from cloudflared to Cloudflare's edge.
type TunnelConn struct {
	ID                 string    `json:"id"`
	ColoName           string    `json:"colo_name"`
	UUID               string    `json:"uuid"`
	IsPendingReconnect bool      `json:"is_pending_reconnect"`
	OriginIP           string    `json:"origin_ip"`
	Hostname           string    `json:"hostname,omitempty"` // resolved via reverse DNS
	OpenedAt           time.Time `json:"opened_at"`
	ClientID           string    `json:"client_id"`
	ClientVersion      string    `json:"client_version"`
}

// TunnelWithCredentials is a tunnel response that also contains credentials (only on creation).
type TunnelWithCredentials struct {
	Tunnel
	CredentialsFile *TunnelCredentialsFile `json:"credentials_file,omitempty"`
	Token           string                 `json:"token,omitempty"`
}

// TunnelCredentialsFile holds the credentials for running cloudflared.
type TunnelCredentialsFile struct {
	AccountTag   string `json:"AccountTag"`
	TunnelID     string `json:"TunnelID"`
	TunnelName   string `json:"TunnelName"`
	TunnelSecret string `json:"TunnelSecret"`
}

// TunnelConfig represents the remote configuration of a tunnel.
type TunnelConfig struct {
	TunnelID  string           `json:"tunnel_id"`
	Version   int              `json:"version"`
	Config    TunnelConfigBody `json:"config"`
	Source    string           `json:"source"`
	CreatedAt time.Time        `json:"created_at"`
}

// TunnelConfigBody holds the actual ingress and routing config.
type TunnelConfigBody struct {
	Ingress       []IngressRule  `json:"ingress"`
	WarpRouting   *WarpRouting   `json:"warp-routing,omitempty"`
	OriginRequest *OriginRequest `json:"originRequest,omitempty"`
}

// IngressRule routes traffic from a public hostname to a local service.
type IngressRule struct {
	Hostname      string         `json:"hostname,omitempty"`
	Service       string         `json:"service"`
	Path          string         `json:"path,omitempty"`
	OriginRequest *OriginRequest `json:"originRequest,omitempty"`
}

// WarpRouting configures WARP routing for the tunnel.
type WarpRouting struct {
	Enabled bool `json:"enabled"`
}

// OriginRequest holds per-ingress origin request settings.
type OriginRequest struct {
	ConnectTimeout         *Duration `json:"connectTimeout,omitempty"`
	TLSTimeout             *Duration `json:"tlsTimeout,omitempty"`
	TCPKeepAlive           *Duration `json:"tcpKeepAlive,omitempty"`
	NoHappyEyeballs        *bool     `json:"noHappyEyeballs,omitempty"`
	KeepAliveConnections   *int      `json:"keepAliveConnections,omitempty"`
	KeepAliveTimeout       *Duration `json:"keepAliveTimeout,omitempty"`
	HTTPHostHeader         string    `json:"httpHostHeader,omitempty"`
	OriginServerName       string    `json:"originServerName,omitempty"`
	NoTLSVerify            *bool     `json:"noTLSVerify,omitempty"`
	DisableChunkedEncoding *bool     `json:"disableChunkedEncoding,omitempty"`
	BastionMode            *bool     `json:"bastionMode,omitempty"`
	ProxyAddress           string    `json:"proxyAddress,omitempty"`
	ProxyPort              *uint     `json:"proxyPort,omitempty"`
	ProxyType              string    `json:"proxyType,omitempty"`
	HTTP2Origin            *bool     `json:"http2Origin,omitempty"`
	HTTP3Origin            *bool     `json:"http3Origin,omitempty"`
}

// Duration is a wrapper for time.Duration that marshals as seconds for the CF API.
type Duration struct {
	time.Duration
}

func (d Duration) MarshalJSON() ([]byte, error) {
	return []byte(fmt.Sprintf(`"%s"`, d.Duration.String())), nil
}

// ListTunnels returns all active cloudflared tunnels for the account.
func (s *Service) ListTunnels(ctx context.Context) ([]Tunnel, error) {
	path := fmt.Sprintf("/accounts/%s/cfd_tunnel?is_deleted=false", s.AccountID)
	var tunnels []Tunnel
	if _, err := s.getList(ctx, path, &tunnels); err != nil {
		return nil, fmt.Errorf("listing tunnels: %w", err)
	}
	return tunnels, nil
}

// GetTunnel returns a single tunnel by ID including its active connections.
// Connector origin IPs are enriched with a reverse-DNS hostname lookup (best-effort).
func (s *Service) GetTunnel(ctx context.Context, tunnelID string) (*Tunnel, error) {
	path := fmt.Sprintf("/accounts/%s/cfd_tunnel/%s", s.AccountID, tunnelID)
	var tunnel Tunnel
	if err := s.get(ctx, path, &tunnel); err != nil {
		return nil, fmt.Errorf("getting tunnel %s: %w", tunnelID, err)
	}
	// Enrich each connector with a reverse-DNS hostname (best effort, 2 s budget).
	enrichCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	type result struct {
		idx  int
		host string
	}
	ch := make(chan result, len(tunnel.Connections))
	for i, conn := range tunnel.Connections {
		if conn.OriginIP == "" {
			continue
		}
		go func(idx int, ip string) {
			var r net.Resolver
			addrs, err := r.LookupAddr(enrichCtx, ip)
			if err == nil && len(addrs) > 0 {
				ch <- result{idx: idx, host: strings.TrimSuffix(addrs[0], ".")}
			} else {
				ch <- result{idx: idx}
			}
		}(i, conn.OriginIP)
	}
	for range tunnel.Connections {
		select {
		case r := <-ch:
			if r.host != "" {
				tunnel.Connections[r.idx].Hostname = r.host
			}
		case <-enrichCtx.Done():
		}
	}
	return &tunnel, nil
}

// CreateTunnel creates a new remotely-managed cloudflared tunnel.
func (s *Service) CreateTunnel(ctx context.Context, name string) (*TunnelWithCredentials, error) {
	path := fmt.Sprintf("/accounts/%s/cfd_tunnel", s.AccountID)
	body := map[string]any{
		"name":       name,
		"config_src": "cloudflare",
	}
	var result TunnelWithCredentials
	if err := s.post(ctx, path, body, &result); err != nil {
		return nil, fmt.Errorf("creating tunnel: %w", err)
	}
	return &result, nil
}

// DeleteTunnel deletes a tunnel by ID.
func (s *Service) DeleteTunnel(ctx context.Context, tunnelID string) error {
	path := fmt.Sprintf("/accounts/%s/cfd_tunnel/%s", s.AccountID, tunnelID)
	if err := s.delete(ctx, path, nil); err != nil {
		return fmt.Errorf("deleting tunnel %s: %w", tunnelID, err)
	}
	return nil
}

// GetTunnelToken returns the token required to run cloudflared for a tunnel.
func (s *Service) GetTunnelToken(ctx context.Context, tunnelID string) (string, error) {
	path := fmt.Sprintf("/accounts/%s/cfd_tunnel/%s/token", s.AccountID, tunnelID)
	var token string
	if err := s.get(ctx, path, &token); err != nil {
		return "", fmt.Errorf("getting tunnel token: %w", err)
	}
	return token, nil
}

// GetTunnelConfig returns the current remote configuration for a tunnel.
func (s *Service) GetTunnelConfig(ctx context.Context, tunnelID string) (*TunnelConfig, error) {
	path := fmt.Sprintf("/accounts/%s/cfd_tunnel/%s/configurations", s.AccountID, tunnelID)
	var cfg TunnelConfig
	if err := s.get(ctx, path, &cfg); err != nil {
		return nil, fmt.Errorf("getting tunnel config for %s: %w", tunnelID, err)
	}
	return &cfg, nil
}

// UpdateTunnelConfig replaces the entire ingress configuration for a tunnel.
// The last ingress rule must be a catch-all without a hostname.
func (s *Service) UpdateTunnelConfig(ctx context.Context, tunnelID string, config TunnelConfigBody) (*TunnelConfig, error) {
	path := fmt.Sprintf("/accounts/%s/cfd_tunnel/%s/configurations", s.AccountID, tunnelID)
	body := map[string]any{"config": config}
	var result TunnelConfig
	if err := s.put(ctx, path, body, &result); err != nil {
		return nil, fmt.Errorf("updating tunnel config for %s: %w", tunnelID, err)
	}
	return &result, nil
}

// AddIngressRule adds a hostname+service route to a tunnel's ingress, maintaining the catch-all.
func (s *Service) AddIngressRule(ctx context.Context, tunnelID string, rule IngressRule) (*TunnelConfig, error) {
	existing, err := s.GetTunnelConfig(ctx, tunnelID)
	if err != nil {
		return nil, err
	}

	rules := filterNonCatchAll(existing.Config.Ingress)
	rules = append(rules, rule)
	// Ensure catch-all is always last
	rules = append(rules, IngressRule{Service: "http_status:404"})

	cfg := existing.Config
	cfg.Ingress = rules
	return s.UpdateTunnelConfig(ctx, tunnelID, cfg)
}

// RemoveIngressRule removes a hostname from a tunnel's ingress rules.
func (s *Service) RemoveIngressRule(ctx context.Context, tunnelID, hostname string) (*TunnelConfig, error) {
	existing, err := s.GetTunnelConfig(ctx, tunnelID)
	if err != nil {
		return nil, err
	}

	var rules []IngressRule
	for _, r := range existing.Config.Ingress {
		if r.Hostname != hostname {
			rules = append(rules, r)
		}
	}
	// Ensure catch-all at end
	rules = filterNonCatchAll(rules)
	rules = append(rules, IngressRule{Service: "http_status:404"})

	cfg := existing.Config
	cfg.Ingress = rules
	return s.UpdateTunnelConfig(ctx, tunnelID, cfg)
}

// ManagementResponse holds the management endpoint URL returned by CF for live log streaming.
type ManagementResponse struct {
	URL string `json:"url"`
}

// GetManagementToken requests a management token for live log streaming via WebSocket.
// The returned URL already embeds the token as a query parameter.
// The CF API returns the result as a plain JSON string (the URL itself), not an object.
func (s *Service) GetManagementToken(ctx context.Context, tunnelID string) (*ManagementResponse, error) {
	path := fmt.Sprintf("/accounts/%s/cfd_tunnel/%s/management", s.AccountID, tunnelID)
	body := map[string]any{"resources": []string{"logs"}}
	var url string
	if err := s.post(ctx, path, body, &url); err != nil {
		return nil, fmt.Errorf("getting management token for %s: %w", tunnelID, err)
	}
	return &ManagementResponse{URL: url}, nil
}

// UpdateWarpRouting enables or disables WARP routing for a tunnel.
func (s *Service) UpdateWarpRouting(ctx context.Context, tunnelID string, enabled bool) (*TunnelConfig, error) {
	existing, err := s.GetTunnelConfig(ctx, tunnelID)
	if err != nil {
		return nil, err
	}
	cfg := existing.Config
	cfg.WarpRouting = &WarpRouting{Enabled: enabled}
	return s.UpdateTunnelConfig(ctx, tunnelID, cfg)
}

// filterNonCatchAll removes any rules that have no hostname (i.e. catch-all rules).
func filterNonCatchAll(rules []IngressRule) []IngressRule {
	var out []IngressRule
	for _, r := range rules {
		if r.Hostname != "" {
			out = append(out, r)
		}
	}
	return out
}

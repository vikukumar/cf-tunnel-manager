package config

import (
	"fmt"
	"strings"

	"github.com/spf13/viper"
)

// Config holds all application configuration.
type Config struct {
	Server      ServerConfig      `mapstructure:"server"`
	Cloudflare  CloudflareConfig  `mapstructure:"cloudflare"`
	Auth        AuthConfig        `mapstructure:"auth"`
}

type ServerConfig struct {
	Host  string `mapstructure:"host"`
	Port  int    `mapstructure:"port"`
	Debug bool   `mapstructure:"debug"`
}

type CloudflareConfig struct {
	APIToken  string `mapstructure:"api_token"`
	AccountID string `mapstructure:"account_id"`
}

type AuthConfig struct {
	CloudflareAccess CloudflareAccessConfig `mapstructure:"cloudflare_access"`
}

type CloudflareAccessConfig struct {
	// Set to true to enable Cloudflare Access JWT validation.
	Enabled bool `mapstructure:"enabled"`
	// TeamDomain is your CF Access team domain, e.g. "yourorg.cloudflareaccess.com".
	TeamDomain string `mapstructure:"team_domain"`
	// Audience is the CF Access application Audience tag (AUD).
	Audience string `mapstructure:"audience"`
	// SkipVerification disables JWT verification (development use only).
	SkipVerification bool `mapstructure:"skip_verification"`
}

// Load reads the configuration from file and environment variables.
func Load() (*Config, error) {
	v := viper.New()

	// Defaults
	v.SetDefault("server.host", "0.0.0.0")
	v.SetDefault("server.port", 8080)
	v.SetDefault("server.debug", false)
	v.SetDefault("auth.cloudflare_access.enabled", false)
	v.SetDefault("auth.cloudflare_access.skip_verification", false)

	// Config file
	v.SetConfigName("config")
	v.SetConfigType("yaml")
	v.AddConfigPath("./configs")
	v.AddConfigPath(".")

	// Environment variable overrides (CF_TUNNEL_UI_SERVER_PORT, etc.)
	v.SetEnvPrefix("CF_TUNNEL_UI")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("reading config file: %w", err)
		}
		// Config file not found is OK  -  env vars suffice.
	}

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unmarshalling config: %w", err)
	}

	if cfg.Cloudflare.APIToken == "" {
		return nil, fmt.Errorf("cloudflare.api_token is required (set via config file or CF_TUNNEL_UI_CLOUDFLARE_API_TOKEN env var)")
	}
	if cfg.Cloudflare.AccountID == "" {
		return nil, fmt.Errorf("cloudflare.account_id is required (set via config file or CF_TUNNEL_UI_CLOUDFLARE_ACCOUNT_ID env var)")
	}

	return &cfg, nil
}

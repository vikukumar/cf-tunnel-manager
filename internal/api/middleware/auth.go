package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/lestrrat-go/jwx/v2/jwk"
	"github.com/lestrrat-go/jwx/v2/jwt"
	"github.com/rs/zerolog/log"
)

// UserInfo holds the authenticated user data extracted from the CF Access JWT.
type UserInfo struct {
	Email string
	Sub   string
}

type contextKey string

const userInfoKey contextKey = "userInfo"

// GetUserInfo retrieves the UserInfo stored in the request context by CFAccessAuth.
func GetUserInfo(c echo.Context) *UserInfo {
	if ui, ok := c.Request().Context().Value(userInfoKey).(*UserInfo); ok {
		return ui
	}
	return nil
}

// jwksCache caches the fetched JWKS to avoid redundant network calls.
type jwksCache struct {
	mu        sync.RWMutex
	keySet    jwk.Set
	fetchedAt time.Time
	ttl       time.Duration
}

func (c *jwksCache) get(ctx context.Context, certsURL string) (jwk.Set, error) {
	c.mu.RLock()
	if c.keySet != nil && time.Since(c.fetchedAt) < c.ttl {
		ks := c.keySet
		c.mu.RUnlock()
		return ks, nil
	}
	c.mu.RUnlock()

	c.mu.Lock()
	defer c.mu.Unlock()

	// Double-check after acquiring write lock.
	if c.keySet != nil && time.Since(c.fetchedAt) < c.ttl {
		return c.keySet, nil
	}

	ks, err := jwk.Fetch(ctx, certsURL)
	if err != nil {
		return nil, fmt.Errorf("fetching JWKS from %s: %w", certsURL, err)
	}
	c.keySet = ks
	c.fetchedAt = time.Now()
	return ks, nil
}

// CFAccessAuthConfig holds configuration for the Cloudflare Access JWT middleware.
type CFAccessAuthConfig struct {
	// TeamDomain is your team domain, e.g. "yourorg.cloudflareaccess.com".
	TeamDomain string
	// Audience is your CF Access application AUD tag.
	Audience string
	// SkipVerification disables JWT verification (development only).
	SkipVerification bool
}

// CFAccessAuth returns an Echo middleware that validates Cloudflare Access JWTs.
// The JWT is read from the CF_Authorization cookie or the Authorization header.
func CFAccessAuth(cfg CFAccessAuthConfig) echo.MiddlewareFunc {
	cache := &jwksCache{ttl: 5 * time.Minute}
	certsURL := fmt.Sprintf("https://%s/cdn-cgi/access/certs", strings.TrimPrefix(cfg.TeamDomain, "https://"))

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if cfg.SkipVerification {
				// In dev mode, inject a placeholder user so handlers work normally.
				ctx := context.WithValue(c.Request().Context(), userInfoKey, &UserInfo{Email: "dev@local", Sub: "dev"})
				c.SetRequest(c.Request().WithContext(ctx))
				return next(c)
			}

			rawToken := extractToken(c.Request())
			if rawToken == "" {
				return echo.NewHTTPError(http.StatusUnauthorized, "missing Cloudflare Access token")
			}

			keySet, err := cache.get(c.Request().Context(), certsURL)
			if err != nil {
				log.Error().Err(err).Msg("Failed to fetch CF Access JWKS")
				return echo.NewHTTPError(http.StatusInternalServerError, "unable to verify identity")
			}

			token, err := jwt.Parse(
				[]byte(rawToken),
				jwt.WithKeySet(keySet),
				jwt.WithValidate(true),
				jwt.WithAudience(cfg.Audience),
				jwt.WithIssuer(fmt.Sprintf("https://%s", strings.TrimPrefix(cfg.TeamDomain, "https://"))),
			)
			if err != nil {
				log.Warn().Err(err).Msg("CF Access JWT validation failed")
				return echo.NewHTTPError(http.StatusUnauthorized, "invalid or expired token")
			}

			email, _ := token.Get("email")
			emailStr, _ := email.(string)
			if emailStr == "" {
				emailStr = token.Subject()
			}

			userInfo := &UserInfo{
				Email: emailStr,
				Sub:   token.Subject(),
			}

			ctx := context.WithValue(c.Request().Context(), userInfoKey, userInfo)
			c.SetRequest(c.Request().WithContext(ctx))
			return next(c)
		}
	}
}

// extractToken reads the JWT from the CF_Authorization cookie or Bearer Authorization header.
func extractToken(r *http.Request) string {
	// Prefer the CF_Authorization cookie (set by CF Access).
	if cookie, err := r.Cookie("CF_Authorization"); err == nil {
		return cookie.Value
	}
	// Fall back to Authorization header.
	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		return strings.TrimPrefix(authHeader, "Bearer ")
	}
	return ""
}

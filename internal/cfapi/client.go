package cfapi

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/rs/zerolog"
)

const cfBaseURL = "https://api.cloudflare.com/client/v4"

// Service wraps the Cloudflare REST API with typed helper methods.
type Service struct {
	httpClient *http.Client
	apiToken   string
	AccountID  string
	logger     zerolog.Logger
}

// New creates a new Cloudflare API service using the provided API token and account ID.
func New(apiToken, accountID string, logger zerolog.Logger) *Service {
	return &Service{
		httpClient: &http.Client{Timeout: 30 * time.Second},
		apiToken:   apiToken,
		AccountID:  accountID,
		logger:     logger.With().Str("component", "cfapi").Logger(),
	}
}

// cfEnvelope matches the standard Cloudflare API response envelope.
type cfEnvelope[T any] struct {
	Success    bool        `json:"success"`
	Errors     []CFError   `json:"errors"`
	Messages   []string    `json:"messages"`
	Result     T           `json:"result"`
	ResultInfo *ResultInfo `json:"result_info,omitempty"`
}

// CFError represents a Cloudflare API error item.
type CFError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// ResultInfo holds pagination metadata.
type ResultInfo struct {
	Page       int `json:"page"`
	PerPage    int `json:"per_page"`
	TotalPages int `json:"total_pages"`
	Count      int `json:"count"`
	TotalCount int `json:"total_count"`
}

func (s *Service) doRequest(ctx context.Context, method, path string, body interface{}) ([]byte, error) {
	var bodyReader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("marshalling request body: %w", err)
		}
		bodyReader = bytes.NewReader(b)
	}

	url := cfBaseURL + path
	req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+s.apiToken)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "cloudflare-tunnel-ui/1.0")

	s.logger.Debug().Str("method", method).Str("url", url).Msg("CF API request")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("executing request: %w", err)
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response body: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var errEnv cfEnvelope[json.RawMessage]
		if jsonErr := json.Unmarshal(data, &errEnv); jsonErr == nil && len(errEnv.Errors) > 0 {
			return nil, fmt.Errorf("CF API error %d: %s", errEnv.Errors[0].Code, errEnv.Errors[0].Message)
		}
		return nil, fmt.Errorf("CF API HTTP %d: %s", resp.StatusCode, string(data))
	}

	return data, nil
}

// get performs a GET request and unmarshals the result field into result.
func (s *Service) get(ctx context.Context, path string, result interface{}) error {
	data, err := s.doRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return err
	}
	return unmarshalResult(data, result)
}

// getList like get but also returns pagination info.
func (s *Service) getList(ctx context.Context, path string, result interface{}) (*ResultInfo, error) {
	data, err := s.doRequest(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, err
	}
	return unmarshalResultWithInfo(data, result)
}

// post performs a POST request and unmarshals the result field.
func (s *Service) post(ctx context.Context, path string, body, result interface{}) error {
	data, err := s.doRequest(ctx, http.MethodPost, path, body)
	if err != nil {
		return err
	}
	if result == nil {
		return nil
	}
	return unmarshalResult(data, result)
}

// put performs a PUT request and unmarshals the result field.
func (s *Service) put(ctx context.Context, path string, body, result interface{}) error {
	data, err := s.doRequest(ctx, http.MethodPut, path, body)
	if err != nil {
		return err
	}
	if result == nil {
		return nil
	}
	return unmarshalResult(data, result)
}

// delete performs a DELETE request.
func (s *Service) delete(ctx context.Context, path string, body interface{}) error {
	_, err := s.doRequest(ctx, http.MethodDelete, path, body)
	return err
}

func unmarshalResult(data []byte, result interface{}) error {
	var env struct {
		Success bool             `json:"success"`
		Errors  []CFError        `json:"errors"`
		Result  json.RawMessage  `json:"result"`
	}
	if err := json.Unmarshal(data, &env); err != nil {
		return fmt.Errorf("decoding CF response envelope: %w", err)
	}
	if !env.Success && len(env.Errors) > 0 {
		return fmt.Errorf("CF API error %d: %s", env.Errors[0].Code, env.Errors[0].Message)
	}
	if result == nil {
		return nil
	}
	if len(env.Result) == 0 || string(env.Result) == "null" {
		return nil
	}
	return json.Unmarshal(env.Result, result)
}

func unmarshalResultWithInfo(data []byte, result interface{}) (*ResultInfo, error) {
	var env struct {
		Success    bool             `json:"success"`
		Errors     []CFError        `json:"errors"`
		Result     json.RawMessage  `json:"result"`
		ResultInfo *ResultInfo      `json:"result_info,omitempty"`
	}
	if err := json.Unmarshal(data, &env); err != nil {
		return nil, fmt.Errorf("decoding CF response envelope: %w", err)
	}
	if !env.Success && len(env.Errors) > 0 {
		return nil, fmt.Errorf("CF API error %d: %s", env.Errors[0].Code, env.Errors[0].Message)
	}
	if result != nil {
		if err := json.Unmarshal(env.Result, result); err != nil {
			return nil, fmt.Errorf("decoding CF result: %w", err)
		}
	}
	return env.ResultInfo, nil
}

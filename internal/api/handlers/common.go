package handlers

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

// APIResponse is the standard JSON envelope returned by all API endpoints.
type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   *APIErrDetail `json:"error,omitempty"`
}

// APIErrDetail contains error details.
type APIErrDetail struct {
	Message string `json:"message"`
	Detail  string `json:"detail,omitempty"`
}

func successResponse(data interface{}) APIResponse {
	return APIResponse{Success: true, Data: data}
}

func apiError(c echo.Context, statusCode int, message string, err error) error {
	detail := ""
	if err != nil {
		detail = err.Error()
	}
	return c.JSON(statusCode, APIResponse{
		Success: false,
		Error: &APIErrDetail{
			Message: message,
			Detail:  detail,
		},
	})
}

func bindAndValidate(c echo.Context, v interface{}) error {
	if err := c.Bind(v); err != nil {
		return c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   &APIErrDetail{Message: "Invalid request body", Detail: err.Error()},
		})
	}
	if err := c.Validate(v); err != nil {
		return c.JSON(http.StatusUnprocessableEntity, APIResponse{
			Success: false,
			Error:   &APIErrDetail{Message: "Validation failed", Detail: err.Error()},
		})
	}
	return nil
}

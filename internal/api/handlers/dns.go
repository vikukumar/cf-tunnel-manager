package handlers

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/rs/zerolog"

	"github.com/vikukumar/cf-tunnel-manager/internal/cfapi"
)

// DNSHandler handles DNS record endpoints.
type DNSHandler struct {
	cf     *cfapi.Service
	logger zerolog.Logger
}

// NewDNSHandler creates a DNSHandler.
func NewDNSHandler(cf *cfapi.Service, logger zerolog.Logger) *DNSHandler {
	return &DNSHandler{cf: cf, logger: logger}
}

// ListRecords returns all DNS records for a zone.
// GET /api/zones/:zoneId/dns
func (h *DNSHandler) ListRecords(c echo.Context) error {
	zoneID := c.Param("zoneId")
	records, err := h.cf.ListDNSRecords(c.Request().Context(), zoneID)
	if err != nil {
		return apiError(c, http.StatusBadGateway, "Failed to list DNS records", err)
	}
	return c.JSON(http.StatusOK, successResponse(records))
}

// CreateRecord creates a new DNS record.
// POST /api/zones/:zoneId/dns
func (h *DNSHandler) CreateRecord(c echo.Context) error {
	zoneID := c.Param("zoneId")
	var params cfapi.CreateDNSRecordParams
	if err := bindAndValidate(c, &params); err != nil {
		return err
	}
	record, err := h.cf.CreateDNSRecord(c.Request().Context(), zoneID, params)
	if err != nil {
		return apiError(c, http.StatusBadGateway, "Failed to create DNS record", err)
	}
	return c.JSON(http.StatusCreated, successResponse(record))
}

// DeleteRecord removes a DNS record.
// DELETE /api/zones/:zoneId/dns/:recordId
func (h *DNSHandler) DeleteRecord(c echo.Context) error {
	zoneID := c.Param("zoneId")
	recordID := c.Param("recordId")
	if err := h.cf.DeleteDNSRecord(c.Request().Context(), zoneID, recordID); err != nil {
		return apiError(c, http.StatusBadGateway, "Failed to delete DNS record", err)
	}
	return c.JSON(http.StatusOK, successResponse(map[string]string{"id": recordID}))
}

// ZoneHandler handles zone listing endpoints.
type ZoneHandler struct {
	cf     *cfapi.Service
	logger zerolog.Logger
}

// NewZoneHandler creates a ZoneHandler.
func NewZoneHandler(cf *cfapi.Service, logger zerolog.Logger) *ZoneHandler {
	return &ZoneHandler{cf: cf, logger: logger}
}

// ListZones returns all zones accessible to the configured account.
// GET /api/zones
func (h *ZoneHandler) ListZones(c echo.Context) error {
	zones, err := h.cf.ListZones(c.Request().Context())
	if err != nil {
		return apiError(c, http.StatusBadGateway, "Failed to list zones", err)
	}
	return c.JSON(http.StatusOK, successResponse(zones))
}

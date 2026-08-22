package controllers

import (
	"net/http"

	"sight-reading/database"
	"sight-reading/httpx"
)

// RegisterHealthRoutes registers the health check.
//
// Health takes no Querier: it checks the raw connection, because a
// sqlc query would tell you the same thing more slowly.
func RegisterHealthRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /health", handleHealthCheck())
}

// handleHealthCheck handles GET /health.
// @Summary  Service health check
// @Tags     health
// @Produce  json
// @Success  200 {object} map[string]interface{}
// @Failure  503 {object} map[string]interface{}
// @Router   /health [get]
func handleHealthCheck() http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		status := "healthy"
		httpStatus := http.StatusOK
		checks := make(map[string]string)

		if database.DBConn == nil {
			status = "unhealthy"
			httpStatus = http.StatusServiceUnavailable
			checks["database"] = "not initialized"
		} else if err := database.DBConn.Ping(); err != nil {
			status = "unhealthy"
			httpStatus = http.StatusServiceUnavailable
			checks["database"] = err.Error()
		} else {
			checks["database"] = "connected"
		}

		httpx.JSON(w, httpStatus, httpx.M{
			"status": status,
			"checks": checks,
		})
	}
}

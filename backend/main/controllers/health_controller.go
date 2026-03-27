package controllers

import (
	"net/http"
	"sight-reading/database"

	"github.com/gin-gonic/gin"
)

func SetupHealthRoutes(router *gin.Engine) {
	router.GET("/health", healthCheck)
}

func healthCheck(c *gin.Context) {
	status := "healthy"
	httpStatus := http.StatusOK
	checks := make(map[string]string)

	if err := database.DBConn.Ping(); err != nil {
		status = "unhealthy"
		httpStatus = http.StatusServiceUnavailable
		checks["database"] = err.Error()
	} else {
		checks["database"] = "connected"
	}

	c.JSON(httpStatus, gin.H{
		"status": status,
		"checks": checks,
	})
}

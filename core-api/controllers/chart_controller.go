package controllers

import (
	"sight-reading/middleware"
	"sight-reading/services"

	"github.com/gin-gonic/gin"
)

// SetupChartRoutes initializes all chart-related routes
// All routes are protected with JWT authentication middleware
func SetupChartRoutes(router *gin.Engine) {
	charts := router.Group("/api/charts")
	charts.Use(middleware.AuthMiddleware()) // Protect all chart routes
	{
		// Personal user metrics
		// GET /api/charts/user/:userId/metrics?interval=day&days=30
		charts.GET("/user/:userId/metrics", services.GetUserChartData)

		// Teacher class metrics (aggregated across all students)
		// GET /api/charts/teacher/class-metrics?interval=day&days=30
		charts.GET("/teacher/class-metrics", services.GetTeacherClassChartData)
	}
}

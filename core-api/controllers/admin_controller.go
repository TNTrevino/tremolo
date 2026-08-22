// Package controllers handles the routing of our service functions
package controllers

import (
	"errors"
	"net/http"

	"sight-reading/database"
	"sight-reading/logger"
	"sight-reading/middleware"
	"sight-reading/services"

	"github.com/gin-gonic/gin"
)

// SetupAdminRoutes registers the admin user-management routes (list/get
// teachers and students, create a user). All routes require authentication
// and are further restricted to the ADMIN role by adminOnly.
func SetupAdminRoutes(router *gin.Engine) {
	admin := router.Group("/")
	admin.Use(middleware.AuthMiddleware())
	{
		admin.GET("/teachers", adminOnly(services.GetTeachers))
		admin.GET("/teacher/:id", adminOnly(services.GetTeacher))
		admin.GET("/students", adminOnly(services.GetStudents))
		admin.GET("/student/:id", adminOnly(services.GetStudent))
		admin.POST("/user", adminOnly(services.CreateUser))
	}
}

// adminOnly restricts a handler to authenticated callers with the ADMIN
// role via services.RequireAdmin. A missing user ID and a non-admin role
// both respond with an identical 403, so nothing about the caller's
// account leaks; an unexpected lookup failure is logged and reported as
// a 500 so a DB outage is not mistaken for a permissions problem.
func adminOnly(h gin.HandlerFunc) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, err := middleware.GetAuthenticatedUserID(c)
		if err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
			return
		}

		if err := services.RequireAdmin(c.Request.Context(), database.Queries, userID); err != nil {
			if errors.Is(err, services.ErrForbidden) {
				c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
				return
			}
			logger.Error("failed to check admin role", "error", err, "userID", userID)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Something went wrong"})
			return
		}

		h(c)
	}
}

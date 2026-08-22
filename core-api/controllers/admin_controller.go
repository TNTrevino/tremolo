// Package controllers handles the routing of our service functions
package controllers

import (
	"net/http"

	dtos "sight-reading/DTOs"
	"sight-reading/database"
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
// role. The JWT only carries a user ID, so the role is a DB lookup on every
// call. Errors (missing user ID, lookup failure) and a non-admin role all
// respond the same way, so nothing about the caller's account leaks.
func adminOnly(h gin.HandlerFunc) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, err := middleware.GetAuthenticatedUserID(c)
		if err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
			return
		}

		role, err := database.Queries.GetUserRole(c.Request.Context(), int32(userID))
		if err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
			return
		}
		if role != string(dtos.Admin) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
			return
		}

		h(c)
	}
}

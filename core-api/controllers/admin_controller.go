// Package controllers handles the routing of our service functions
package controllers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	dtos "sight-reading/DTOs"
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
		admin.GET("/teachers", adminOnly(GetTeachers))
		admin.GET("/teacher/:id", adminOnly(GetTeacher))
		admin.GET("/students", adminOnly(GetStudents))
		admin.GET("/student/:id", adminOnly(GetStudent))
		admin.POST("/user", adminOnly(CreateUser))
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

// idPathParam parses the ":id" path param the way the pre-refactor
// handlers did: any non-numeric value is a 422, and negative/zero values
// are passed through (the service reports them not found rather than
// rejecting the shape).
func idPathParam(c *gin.Context) (int, bool) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error":   true,
			"message": "Invalid request body",
		})
		return 0, false
	}
	return id, true
}

// CreateUser handles POST /user: admin-created users (student/teacher/
// parent -- ADMIN creation is rejected).
// Protected: Requires JWT authentication (ADMIN role, via adminOnly)
func CreateUser(c *gin.Context) {
	var reqBody dtos.CreateUserRequest

	if err := c.ShouldBindJSON(&reqBody); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error":    true,
			"message":  "Invalid json body",
			"scenario": "TS.1",
		})
		return
	}

	result, err := services.CreateUser(c.Request.Context(), database.Queries, &reqBody)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrValidation):
			c.JSON(http.StatusUnprocessableEntity, gin.H{
				"error":    strings.TrimPrefix(err.Error(), services.ErrValidation.Error()+": "),
				"message":  "Information invalid",
				"scenario": "TS.2",
			})
		case errors.Is(err, services.ErrForbidden):
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Creating ADMIN users is not allowed",
			})
		case errors.Is(err, services.ErrInvalidRole):
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid role",
				"message": "Role not found",
			})
		default:
			logger.Error("failed to create user", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		}
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"body":   result,
		"status": "teacher created sucessfully",
	})
}

// GetStudents handles GET /students.
// Protected: Requires JWT authentication (ADMIN role, via adminOnly)
func GetStudents(c *gin.Context) {
	students, err := services.GetStudents(c.Request.Context(), database.Queries)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve students"})
		return
	}
	c.JSON(http.StatusOK, students)
}

// GetStudent handles GET /student/:id.
// Protected: Requires JWT authentication (ADMIN role, via adminOnly)
func GetStudent(c *gin.Context) {
	id, ok := idPathParam(c)
	if !ok {
		return
	}

	student, err := services.GetStudent(c.Request.Context(), database.Queries, id)
	if err != nil {
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve student"})
		return
	}
	c.JSON(http.StatusOK, student)
}

// GetTeachers handles GET /teachers.
// Protected: Requires JWT authentication (ADMIN role, via adminOnly)
func GetTeachers(c *gin.Context) {
	teachers, err := services.GetTeachers(c.Request.Context(), database.Queries)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve teachers"})
		return
	}
	c.JSON(http.StatusOK, teachers)
}

// GetTeacher handles GET /teacher/:id.
// Protected: Requires JWT authentication (ADMIN role, via adminOnly)
func GetTeacher(c *gin.Context) {
	id, ok := idPathParam(c)
	if !ok {
		return
	}

	teacher, err := services.GetTeacher(c.Request.Context(), database.Queries, id)
	if err != nil {
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   true,
				"message": "not found",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   true,
			"message": "Something went wrong",
		})
		return
	}
	c.JSON(http.StatusOK, teacher)
}

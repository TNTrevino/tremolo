package controllers

import (
	"net/http"
	"sight-reading/middleware"
	"sight-reading/services"
	"strconv"

	"github.com/gin-gonic/gin"
)

// SetupUserInfoRoutes initializes all user information routes
// All routes are protected with JWT authentication middleware
func SetupUserInfoRoutes(router *gin.Engine) {
	userInfo := router.Group("/api/users")
	userInfo.Use(middleware.AuthMiddleware()) // Protect all user info routes
	{
		// GET /api/users/:userId/general-info
		userInfo.GET("/:userId/general-info", GetGeneralUserInfo)
	}
}

// GetGeneralUserInfo fetches general user information including name, join date, and aggregate stats
// Protected: Requires JWT authentication, users can only access their own data
func GetGeneralUserInfo(c *gin.Context) {
	// Set by AuthMiddleware
	userIDInterface, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	authenticatedUserID, ok := userIDInterface.(int)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID"})
		return
	}

	// Extract requested user ID from URL parameter
	requestedUserIDStr := c.Param("userId")
	requestedUserID, err := strconv.Atoi(requestedUserIDStr)
	if err != nil || requestedUserID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID parameter"})
		return
	}

	// Security: Verify user can only access their own data
	if authenticatedUserID != requestedUserID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}
	// TODO: Future enhancement - allow teachers to view their students' info
	// Will require checking teacher_student table relationship

	// Fetch user information
	userInfo, err := services.GetGeneralUserInfo(requestedUserID)
	if err != nil {
		// Check if user not found
		if err.Error() == "user not found with ID: "+requestedUserIDStr {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user information"})
		return
	}

	c.JSON(http.StatusOK, userInfo)
}

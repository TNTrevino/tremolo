package controllers

import (
	"errors"
	"net/http"
	dtos "sight-reading/DTOs"
	"sight-reading/database"
	"sight-reading/middleware"
	"sight-reading/services"

	"github.com/gin-gonic/gin"
)

// SetupNoteGameRoutes initializes all note game routes
func SetupNoteGameRoutes(router *gin.Engine) {
	noteGame := router.Group("/api/note-game")
	noteGame.Use(middleware.AuthMiddleware())
	{
		noteGame.POST("/entry", CreateNoteGameEntry)
		noteGame.GET("/recent", GetRecentNoteGameEntries)
		noteGame.GET("/activity", GetDailyActivityCounts)
	}
}

// CreateNoteGameEntry saves a new note game entry for a user
// Protected: Requires JWT authentication
func CreateNoteGameEntry(c *gin.Context) {
	authenticatedUserID, err := middleware.GetAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var entry dtos.Entry
	if err := c.ShouldBindJSON(&entry); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	ctx := c.Request.Context()
	entryID, err := services.CreateNoteGameEntry(ctx, database.Queries, authenticatedUserID, &entry)
	if err != nil {
		if errors.Is(err, services.ErrUnauthorized) {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Note game entry saved successfully",
		"id":      entryID,
	})
}

// GetRecentNoteGameEntries fetches the last 30 note game entries for the authenticated user
// Protected: Requires JWT authentication
func GetRecentNoteGameEntries(c *gin.Context) {
	authenticatedUserID, err := middleware.GetAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	ctx := c.Request.Context()
	entries, err := services.GetRecentNoteGameEntries(ctx, database.Queries, authenticatedUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch recent entries"})
		return
	}

	c.JSON(http.StatusOK, entries)
}

// GetDailyActivityCounts returns per-day game counts for the activity heatmap
// Protected: Requires JWT authentication
func GetDailyActivityCounts(c *gin.Context) {
	authenticatedUserID, err := middleware.GetAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	ctx := c.Request.Context()
	counts, err := services.GetDailyActivityCounts(ctx, database.Queries, authenticatedUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch activity data"})
		return
	}

	c.JSON(http.StatusOK, counts)
}

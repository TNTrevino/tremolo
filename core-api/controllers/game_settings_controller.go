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

// SetupGameSettingsRoutes initializes the generic per-game settings routes
// (key signature / scale / chord identification games).
func SetupGameSettingsRoutes(router *gin.Engine) {
	settings := router.Group("/api/game-settings")
	settings.Use(middleware.AuthMiddleware())
	{
		settings.GET("", GetGameSettings)
		settings.PUT("", UpdateGameSettings)
	}
}

// GetGameSettings returns the saved settings for the game type given in
// the game_type query parameter.
// Protected: Requires JWT authentication
func GetGameSettings(c *gin.Context) {
	userID, err := middleware.GetAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	gameType := c.Query("game_type")

	ctx := c.Request.Context()
	result, err := services.GetGameSettings(ctx, database.Queries, userID, gameType)
	if err != nil {
		if errors.Is(err, services.ErrValidation) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid game_type"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch settings"})
		return
	}

	if result == nil {
		c.JSON(http.StatusOK, gin.H{"settings": nil})
		return
	}

	c.JSON(http.StatusOK, result)
}

// UpdateGameSettings upserts the settings for one game type.
// Protected: Requires JWT authentication
func UpdateGameSettings(c *gin.Context) {
	userID, err := middleware.GetAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req dtos.GameSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	ctx := c.Request.Context()
	result, err := services.UpsertGameSettings(ctx, database.Queries, userID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

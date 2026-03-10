package controllers

import (
	"net/http"

	dtos "sight-reading/DTOs"
	"sight-reading/database"
	"sight-reading/middleware"
	"sight-reading/services"

	"github.com/gin-gonic/gin"
)

func SetupNoteGameSettingsRoutes(router *gin.Engine) {
	settings := router.Group("/api/note-game/settings")
	settings.Use(middleware.AuthMiddleware())
	{
		settings.GET("", GetNoteGameSettings)
		settings.PUT("", UpdateNoteGameSettings)
	}
}

func GetNoteGameSettings(c *gin.Context) {
	userID, err := middleware.GetAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	ctx := c.Request.Context()
	result, err := services.GetNoteGameSettings(ctx, database.Queries, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch settings"})
		return
	}

	if result == nil {
		c.JSON(http.StatusOK, gin.H{"settings": nil})
		return
	}

	c.JSON(http.StatusOK, result)
}

func UpdateNoteGameSettings(c *gin.Context) {
	userID, err := middleware.GetAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var req dtos.NoteGameSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := req.Validate(); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx := c.Request.Context()
	result, err := services.UpsertNoteGameSettings(ctx, database.Queries, userID, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save settings"})
		return
	}

	c.JSON(http.StatusOK, result)
}

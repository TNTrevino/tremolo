package controllers

import (
	"errors"
	"net/http"

	dtos "sight-reading/DTOs"
	"sight-reading/database"
	"sight-reading/logger"
	"sight-reading/middleware"
	"sight-reading/services"

	"github.com/gin-gonic/gin"
)

func SetupKeyboardBindingsRoutes(router *gin.Engine) {
	bindings := router.Group("/api/note-game/keyboard-bindings")
	bindings.Use(middleware.AuthMiddleware())
	{
		bindings.GET("", GetKeyboardBindings)
		bindings.PUT("", UpdateKeyboardBindings)
	}
}

func GetKeyboardBindings(c *gin.Context) {
	userID, err := middleware.GetAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	ctx := c.Request.Context()
	result, err := services.GetKeyboardBindings(ctx, database.Queries, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch keyboard bindings"})
		return
	}

	if result == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No keyboard bindings found"})
		return
	}

	c.JSON(http.StatusOK, result)
}

func UpdateKeyboardBindings(c *gin.Context) {
	userID, err := middleware.GetAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req dtos.KeyboardBindingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	ctx := c.Request.Context()
	result, err := services.UpsertKeyboardBindings(ctx, database.Queries, userID, &req)
	if err != nil {
		var validationErr *services.ValidationError
		if errors.As(err, &validationErr) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid keyboard bindings"})
			return
		}
		logger.Error("failed to update keyboard bindings", "error", err, "userID", userID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update keyboard bindings"})
		return
	}

	c.JSON(http.StatusOK, result)
}

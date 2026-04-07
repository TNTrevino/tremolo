package controllers

import (
	"errors"
	"net/http"
	"strconv"

	dtos "sight-reading/DTOs"
	"sight-reading/database"
	"sight-reading/logger"
	"sight-reading/middleware"
	"sight-reading/services"

	"github.com/gin-gonic/gin"
)

func SetupColorSchemeRoutes(router *gin.Engine) {
	schemes := router.Group("/api/color-schemes")
	schemes.Use(middleware.AuthMiddleware())
	{
		schemes.GET("", GetColorSchemes)
		schemes.POST("", CreateColorScheme)
		schemes.GET("/active", GetActiveColorScheme)
		schemes.PUT("/active", SetActiveScheme)
		schemes.PUT("/toggle", ToggleScheme)
		schemes.PUT("/preferences", SetPreferredSchemes)
		schemes.PUT("/:id", UpdateColorScheme)
		schemes.DELETE("/:id", DeleteColorScheme)
	}
}

func GetColorSchemes(c *gin.Context) {
	userID, err := middleware.GetAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	ctx := c.Request.Context()
	result, err := services.GetColorSchemes(ctx, database.Queries, userID)
	if err != nil {
		logger.Error("failed to fetch color schemes", "error", err, "userID", userID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch color schemes"})
		return
	}

	c.JSON(http.StatusOK, result)
}

func CreateColorScheme(c *gin.Context) {
	userID, err := middleware.GetAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req dtos.CreateColorSchemeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	ctx := c.Request.Context()
	result, err := services.CreateColorScheme(ctx, database.Queries, userID, &req)
	if err != nil {
		var validationErr *services.ValidationError
		if errors.As(err, &validationErr) {
			c.JSON(http.StatusBadRequest, gin.H{"error": validationErr.Error()})
			return
		}
		logger.Error("failed to create color scheme", "error", err, "userID", userID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create color scheme"})
		return
	}

	c.JSON(http.StatusCreated, result)
}

func GetActiveColorScheme(c *gin.Context) {
	userID, err := middleware.GetAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	ctx := c.Request.Context()
	result, err := services.GetActiveColorScheme(ctx, database.Queries, userID)
	if err != nil {
		logger.Error("failed to fetch active color scheme", "error", err, "userID", userID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch active color scheme"})
		return
	}

	if result == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No active color scheme found"})
		return
	}

	c.JSON(http.StatusOK, result)
}

func SetActiveScheme(c *gin.Context) {
	userID, err := middleware.GetAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req dtos.SetActiveSchemeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	ctx := c.Request.Context()
	err = services.SetActiveScheme(ctx, database.Queries, userID, &req)
	if err != nil {
		var validationErr *services.ValidationError
		if errors.As(err, &validationErr) {
			c.JSON(http.StatusBadRequest, gin.H{"error": validationErr.Error()})
			return
		}
		logger.Error("failed to set active color scheme", "error", err, "userID", userID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to set active color scheme"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Active color scheme updated"})
}

func ToggleScheme(c *gin.Context) {
	userID, err := middleware.GetAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	ctx := c.Request.Context()
	result, err := services.ToggleScheme(ctx, database.Queries, userID)
	if err != nil {
		var validationErr *services.ValidationError
		if errors.As(err, &validationErr) {
			c.JSON(http.StatusBadRequest, gin.H{"error": validationErr.Error()})
			return
		}
		logger.Error("failed to toggle color scheme", "error", err, "userID", userID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to toggle color scheme"})
		return
	}

	c.JSON(http.StatusOK, result)
}

func SetPreferredSchemes(c *gin.Context) {
	userID, err := middleware.GetAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req dtos.SetPreferredSchemesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	ctx := c.Request.Context()
	err = services.SetPreferredSchemes(ctx, database.Queries, userID, &req)
	if err != nil {
		var validationErr *services.ValidationError
		if errors.As(err, &validationErr) {
			c.JSON(http.StatusBadRequest, gin.H{"error": validationErr.Error()})
			return
		}
		logger.Error("failed to set preferred color schemes", "error", err, "userID", userID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to set preferred color schemes"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Preferred color schemes updated"})
}

func UpdateColorScheme(c *gin.Context) {
	userID, err := middleware.GetAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	schemeID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid scheme ID"})
		return
	}

	var req dtos.UpdateColorSchemeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	ctx := c.Request.Context()
	result, err := services.UpdateColorScheme(ctx, database.Queries, userID, schemeID, &req)
	if err != nil {
		var validationErr *services.ValidationError
		if errors.As(err, &validationErr) {
			c.JSON(http.StatusBadRequest, gin.H{"error": validationErr.Error()})
			return
		}
		logger.Error("failed to update color scheme", "error", err, "userID", userID, "schemeID", schemeID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update color scheme"})
		return
	}

	c.JSON(http.StatusOK, result)
}

func DeleteColorScheme(c *gin.Context) {
	userID, err := middleware.GetAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	schemeID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid scheme ID"})
		return
	}

	ctx := c.Request.Context()
	err = services.DeleteColorScheme(ctx, database.Queries, userID, schemeID)
	if err != nil {
		var validationErr *services.ValidationError
		if errors.As(err, &validationErr) {
			c.JSON(http.StatusBadRequest, gin.H{"error": validationErr.Error()})
			return
		}
		logger.Error("failed to delete color scheme", "error", err, "userID", userID, "schemeID", schemeID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete color scheme"})
		return
	}

	c.Status(http.StatusNoContent)
}

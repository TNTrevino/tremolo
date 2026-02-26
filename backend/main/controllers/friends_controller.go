package controllers

import (
	"net/http"
	"sight-reading/database"
	"sight-reading/middleware"
	"sight-reading/services"

	"github.com/gin-gonic/gin"
)

func SetupFriendsRoutes(router *gin.Engine) {
	friends := router.Group("/api/friends")
	friends.Use(middleware.AuthMiddleware())
	{
		friends.GET("", GetFriends)
	}
}

func GetFriends(c *gin.Context) {
	userID, err := middleware.GetAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	ctx := c.Request.Context()
	friends, err := services.GetFriends(ctx, database.Queries, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve friends"})
		return
	}

	c.JSON(http.StatusOK, friends)
}

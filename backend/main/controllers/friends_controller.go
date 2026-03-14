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
		friends.GET("/search", SearchUsers)
		friends.POST("", AddFriend)
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

func SearchUsers(c *gin.Context) {
	userID, err := middleware.GetAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusOK, []any{})
		return
	}

	ctx := c.Request.Context()
	results, err := services.SearchUsers(ctx, database.Queries, userID, query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search users"})
		return
	}

	c.JSON(http.StatusOK, results)
}

type addFriendRequest struct {
	FriendID int `json:"friend_id" binding:"required"`
}

func AddFriend(c *gin.Context) {
	userID, err := middleware.GetAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var req addFriendRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	ctx := c.Request.Context()
	if err := services.AddFriend(ctx, database.Queries, userID, req.FriendID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Friend added successfully"})
}

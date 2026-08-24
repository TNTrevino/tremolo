package controllers

import (
	"context"
	"net/http"

	"sight-reading/database"
	"sight-reading/httpx"
	"sight-reading/logger"
	"sight-reading/middleware"
	"sight-reading/services"
)

// RegisterFriendsRoutes registers the friends routes.
// All routes are protected with JWT authentication middleware.
func RegisterFriendsRoutes(mux *http.ServeMux, q database.Querier) {
	mux.Handle("GET /api/friends", middleware.RequireAuth(handleGetFriends(q)))
	mux.Handle("GET /api/friends/search", middleware.RequireAuth(handleSearchUsers(q)))
	mux.Handle("POST /api/friends", middleware.RequireAuth(handleAddFriend(q)))
}

// @Summary  List friends
// @Tags     friends
// @Security BearerAuth
// @Produce  json
// @Success  200 {array}  dtos.FriendDTO
// @Failure  401 {object} dtos.ErrorResponse
// @Failure  500 {object} dtos.ErrorResponse
// @Router   /api/friends [get]
func handleGetFriends(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}

		friends, err := services.GetFriends(r.Context(), q, userID)
		if err != nil {
			httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Failed to retrieve friends"})
			return
		}

		httpx.JSON(w, http.StatusOK, friends)
	}
}

// @Summary  Search users to add as friends
// @Tags     friends
// @Security BearerAuth
// @Produce  json
// @Param    q query string false "Search text; an empty query returns an empty list"
// @Success  200 {array}  dtos.FriendDTO
// @Failure  401 {object} dtos.ErrorResponse
// @Failure  500 {object} dtos.ErrorResponse
// @Router   /api/friends/search [get]
func handleSearchUsers(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}

		query := r.URL.Query().Get("q")
		if query == "" {
			httpx.JSON(w, http.StatusOK, []any{})
			return
		}

		results, err := services.SearchUsers(r.Context(), q, userID, query)
		if err != nil {
			httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Failed to search users"})
			return
		}

		httpx.JSON(w, http.StatusOK, results)
	}
}

type addFriendRequest struct {
	FriendID int `json:"friend_id"`
}

// Valid rejects a friend_id of 0 as missing rather than as a friend whose
// id is 0. A malformed body and an absent, null or zero friend_id all
// have to produce the same 400.
func (r addFriendRequest) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	if r.FriendID == 0 {
		problems["friend_id"] = "Invalid request body"
	}

	return problems
}

// @Summary  Add a friend
// @Tags     friends
// @Security BearerAuth
// @Accept   json
// @Produce  json
// @Param    friend body addFriendRequest true "ID of the user to add"
// @Success  201 {object} map[string]interface{} "message"
// @Failure  400 {object} dtos.ErrorResponse "Invalid or missing friend_id, or failed to add"
// @Failure  401 {object} dtos.ErrorResponse
// @Router   /api/friends [post]
func handleAddFriend(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}

		req, problems, err := httpx.DecodeValid[addFriendRequest](r)
		if err != nil {
			httpx.DecodeError(w, problems)
			return
		}

		if err := services.AddFriend(r.Context(), q, userID, req.FriendID); err != nil {
			logger.Error("failed to add friend", "error", err, "userID", userID, "friendID", req.FriendID)
			httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": "Failed to add friend"})
			return
		}

		httpx.JSON(w, http.StatusCreated, httpx.M{"message": "Friend added successfully"})
	}
}

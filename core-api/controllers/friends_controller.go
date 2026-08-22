package controllers

import (
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
		userID, err := middleware.AuthenticatedUserID(r)
		if err != nil {
			httpx.JSON(w, http.StatusUnauthorized, httpx.M{"error": "Unauthorized"})
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
		userID, err := middleware.AuthenticatedUserID(r)
		if err != nil {
			httpx.JSON(w, http.StatusUnauthorized, httpx.M{"error": "Unauthorized"})
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
		userID, err := middleware.AuthenticatedUserID(r)
		if err != nil {
			httpx.JSON(w, http.StatusUnauthorized, httpx.M{"error": "Unauthorized"})
			return
		}

		// A friend_id of 0 counts as missing, not as a friend whose ID
		// is 0. httpx.Decode enforces no struct tags, so the check is
		// here by hand: a malformed body and an absent, null or zero
		// friend_id all have to produce the identical 400 below.
		req, err := httpx.Decode[addFriendRequest](r)
		if err != nil || req.FriendID == 0 {
			httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": "Invalid request body"})
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

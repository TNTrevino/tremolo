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

func handleAddFriend(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := middleware.AuthenticatedUserID(r)
		if err != nil {
			httpx.JSON(w, http.StatusUnauthorized, httpx.M{"error": "Unauthorized"})
			return
		}

		// httpx.Decode does not enforce struct tags the way gin's
		// ShouldBindJSON did. FriendID used to carry
		// `binding:"required"`, which gin treats as "zero value is
		// missing" — checking it by hand here reproduces that,
		// including for a friend_id of 0.
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

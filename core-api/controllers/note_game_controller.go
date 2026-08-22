package controllers

import (
	"errors"
	"net/http"

	dtos "sight-reading/DTOs"
	"sight-reading/database"
	"sight-reading/httpx"
	"sight-reading/logger"
	"sight-reading/middleware"
	"sight-reading/services"
)

// RegisterNoteGameRoutes registers all note game routes.
// All routes are protected with JWT authentication middleware.
func RegisterNoteGameRoutes(mux *http.ServeMux, q database.Querier) {
	mux.Handle("POST /api/note-game/entry",
		middleware.RequireAuth(handleCreateNoteGameEntry(q)))
	mux.Handle("GET /api/note-game/recent",
		middleware.RequireAuth(handleGetRecentNoteGameEntries(q)))
	mux.Handle("GET /api/note-game/activity",
		middleware.RequireAuth(handleGetDailyActivityCounts(q)))
}

// handleCreateNoteGameEntry saves a new note game entry for a user
// Protected: Requires JWT authentication
func handleCreateNoteGameEntry(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authenticatedUserID, err := middleware.AuthenticatedUserID(r)
		if err != nil {
			httpx.JSON(w, http.StatusUnauthorized, httpx.M{"error": "Unauthorized"})
			return
		}

		entry, err := httpx.Decode[dtos.Entry](r)
		if err != nil {
			httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": "Invalid request body"})
			return
		}

		ctx := r.Context()
		entryID, err := services.CreateNoteGameEntry(ctx, q, authenticatedUserID, &entry)
		if err != nil {
			if errors.Is(err, services.ErrUnauthorized) {
				httpx.JSON(w, http.StatusForbidden, httpx.M{"error": "Not authorized"})
				return
			}
			logger.Error("failed to create note game entry", "error", err, "userID", authenticatedUserID)
			httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": "Failed to save entry"})
			return
		}

		httpx.JSON(w, http.StatusCreated, httpx.M{
			"message": "Note game entry saved successfully",
			"id":      entryID,
		})
	}
}

// handleGetRecentNoteGameEntries fetches the last 30 note game entries for the authenticated user
// Protected: Requires JWT authentication
func handleGetRecentNoteGameEntries(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authenticatedUserID, err := middleware.AuthenticatedUserID(r)
		if err != nil {
			httpx.JSON(w, http.StatusUnauthorized, httpx.M{"error": "Unauthorized"})
			return
		}

		gameType := r.URL.Query().Get("game_type")

		ctx := r.Context()
		entries, err := services.GetRecentNoteGameEntries(ctx, q, authenticatedUserID, gameType)
		if err != nil {
			if errors.Is(err, services.ErrValidation) {
				httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": "Invalid game_type"})
				return
			}
			httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Failed to fetch recent entries"})
			return
		}

		httpx.JSON(w, http.StatusOK, entries)
	}
}

// handleGetDailyActivityCounts returns per-day game counts for the activity heatmap
// Protected: Requires JWT authentication
func handleGetDailyActivityCounts(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authenticatedUserID, err := middleware.AuthenticatedUserID(r)
		if err != nil {
			httpx.JSON(w, http.StatusUnauthorized, httpx.M{"error": "Unauthorized"})
			return
		}

		ctx := r.Context()
		counts, err := services.GetDailyActivityCounts(ctx, q, authenticatedUserID)
		if err != nil {
			httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Failed to fetch activity data"})
			return
		}

		httpx.JSON(w, http.StatusOK, counts)
	}
}

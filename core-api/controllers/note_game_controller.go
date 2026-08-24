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
// @Summary  Save a note game entry
// @Tags     note-game
// @Security BearerAuth
// @Accept   json
// @Produce  json
// @Param    entry body dtos.Entry true "Entry to record"
// @Success  201 {object} map[string]interface{} "message, id"
// @Failure  400 {object} dtos.ErrorResponse "Invalid request body or failed to save"
// @Failure  401 {object} dtos.ErrorResponse
// @Failure  403 {object} dtos.ErrorResponse "Not authorized to record this entry"
// @Router   /api/note-game/entry [post]
func handleCreateNoteGameEntry(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}

		entry, problems, err := httpx.DecodeValid[dtos.Entry](r)
		if err != nil {
			httpx.DecodeError(w, problems)
			return
		}

		entryID, err := services.CreateNoteGameEntry(r.Context(), q, userID, &entry)
		if err != nil {
			if errors.Is(err, services.ErrUnauthorized) {
				httpx.JSON(w, http.StatusForbidden, httpx.M{"error": "Not authorized"})
				return
			}
			logger.Error("failed to create note game entry", "error", err, "userID", userID)
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
// @Summary  List recent note game entries
// @Tags     note-game
// @Security BearerAuth
// @Produce  json
// @Param    game_type query string false "Filter by game type (defaults to all)"
// @Success  200 {array}  dtos.NoteGameEntryResponse
// @Failure  400 {object} dtos.ErrorResponse "Invalid game_type"
// @Failure  401 {object} dtos.ErrorResponse
// @Failure  500 {object} dtos.ErrorResponse
// @Router   /api/note-game/recent [get]
func handleGetRecentNoteGameEntries(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}

		gameType := r.URL.Query().Get("game_type")

		entries, err := services.GetRecentNoteGameEntries(r.Context(), q, userID, gameType)
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
// @Summary  Get daily activity counts
// @Tags     note-game
// @Security BearerAuth
// @Produce  json
// @Success  200 {array}  dtos.DailyActivityCount
// @Failure  401 {object} dtos.ErrorResponse
// @Failure  500 {object} dtos.ErrorResponse
// @Router   /api/note-game/activity [get]
func handleGetDailyActivityCounts(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}

		counts, err := services.GetDailyActivityCounts(r.Context(), q, userID)
		if err != nil {
			httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Failed to fetch activity data"})
			return
		}

		httpx.JSON(w, http.StatusOK, counts)
	}
}

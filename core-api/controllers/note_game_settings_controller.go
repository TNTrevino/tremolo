package controllers

import (
	"net/http"

	dtos "sight-reading/DTOs"
	"sight-reading/database"
	"sight-reading/httpx"
	"sight-reading/logger"
	"sight-reading/middleware"
	"sight-reading/services"
)

// RegisterNoteGameSettingsRoutes registers the note game settings routes.
// All routes are protected with JWT authentication middleware.
func RegisterNoteGameSettingsRoutes(mux *http.ServeMux, q database.Querier) {
	mux.Handle("GET /api/note-game/settings", middleware.RequireAuth(handleGetNoteGameSettings(q)))
	mux.Handle("PUT /api/note-game/settings", middleware.RequireAuth(handleUpdateNoteGameSettings(q)))
}

func handleGetNoteGameSettings(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}

		result, err := services.GetNoteGameSettings(r.Context(), q, userID)
		if err != nil {
			httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Failed to fetch settings"})
			return
		}

		if result == nil {
			httpx.JSON(w, http.StatusOK, httpx.M{"settings": nil})
			return
		}

		httpx.JSON(w, http.StatusOK, result)
	}
}

func handleUpdateNoteGameSettings(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}

		req, err := httpx.Decode[dtos.NoteGameSettingsRequest](r)
		if err != nil {
			httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": "Invalid request body"})
			return
		}

		result, err := services.UpsertNoteGameSettings(r.Context(), q, userID, &req)
		if err != nil {
			logger.Error("failed to update note game settings", "error", err, "userID", userID)
			httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": "Failed to update settings"})
			return
		}

		httpx.JSON(w, http.StatusOK, result)
	}
}

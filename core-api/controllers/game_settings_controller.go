package controllers

import (
	"errors"
	"net/http"

	dtos "sight-reading/DTOs"
	"sight-reading/database"
	"sight-reading/httpx"
	"sight-reading/middleware"
	"sight-reading/services"
)

// RegisterGameSettingsRoutes registers the generic per-game settings routes
// (key signature / scale / chord identification games).
func RegisterGameSettingsRoutes(mux *http.ServeMux, q database.Querier) {
	mux.Handle("GET /api/game-settings", middleware.RequireAuth(handleGetGameSettings(q)))
	mux.Handle("PUT /api/game-settings", middleware.RequireAuth(handleUpdateGameSettings(q)))
}

// handleGetGameSettings returns the saved settings for the game type given in
// the game_type query parameter.
// Protected: Requires JWT authentication
// @Summary  Get the settings for a game type
// @Tags     game-settings
// @Security BearerAuth
// @Produce  json
// @Param    game_type query string true "Game type identifier"
// @Success  200 {object} dtos.GameSettingsResponse "settings is null if none saved yet"
// @Failure  400 {object} dtos.ErrorResponse "Invalid game_type"
// @Failure  401 {object} dtos.ErrorResponse
// @Failure  500 {object} dtos.ErrorResponse
// @Router   /api/game-settings [get]
func handleGetGameSettings(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := middleware.AuthenticatedUserID(r)
		if err != nil {
			httpx.JSON(w, http.StatusUnauthorized, httpx.M{"error": "Unauthorized"})
			return
		}

		gameType := r.URL.Query().Get("game_type")

		ctx := r.Context()
		result, err := services.GetGameSettings(ctx, q, userID, gameType)
		if err != nil {
			if errors.Is(err, services.ErrValidation) {
				httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": "Invalid game_type"})
				return
			}
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

// handleUpdateGameSettings upserts the settings for one game type.
// Protected: Requires JWT authentication
// @Summary  Update the settings for a game type
// @Tags     game-settings
// @Security BearerAuth
// @Accept   json
// @Produce  json
// @Param    settings body dtos.GameSettingsRequest true "Settings to save"
// @Success  200 {object} dtos.GameSettingsResponse
// @Failure  400 {object} dtos.ErrorResponse "Invalid request body"
// @Failure  401 {object} dtos.ErrorResponse
// @Router   /api/game-settings [put]
func handleUpdateGameSettings(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := middleware.AuthenticatedUserID(r)
		if err != nil {
			httpx.JSON(w, http.StatusUnauthorized, httpx.M{"error": "Unauthorized"})
			return
		}

		req, err := httpx.Decode[dtos.GameSettingsRequest](r)
		if err != nil {
			httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": "Invalid request body"})
			return
		}

		ctx := r.Context()
		result, err := services.UpsertGameSettings(ctx, q, userID, &req)
		if err != nil {
			httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": err.Error()})
			return
		}

		httpx.JSON(w, http.StatusOK, result)
	}
}

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

// RegisterKeyboardBindingsRoutes registers the keyboard bindings routes.
// All routes are protected with JWT authentication middleware.
func RegisterKeyboardBindingsRoutes(mux *http.ServeMux, q database.Querier) {
	mux.Handle("GET /api/note-game/keyboard-bindings",
		middleware.RequireAuth(handleGetKeyboardBindings(q)))
	mux.Handle("PUT /api/note-game/keyboard-bindings",
		middleware.RequireAuth(handleUpdateKeyboardBindings(q)))
}

// @Summary  Get the keyboard bindings
// @Tags     keyboard-bindings
// @Security BearerAuth
// @Produce  json
// @Success  200 {object} dtos.KeyboardBindingsResponse
// @Failure  401 {object} dtos.ErrorResponse
// @Failure  404 {object} dtos.ErrorResponse "No keyboard bindings found"
// @Failure  500 {object} dtos.ErrorResponse
// @Router   /api/note-game/keyboard-bindings [get]
func handleGetKeyboardBindings(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}

		result, err := services.GetKeyboardBindings(r.Context(), q, userID)
		if err != nil {
			httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Failed to fetch keyboard bindings"})
			return
		}

		if result == nil {
			httpx.JSON(w, http.StatusNotFound, httpx.M{"error": "No keyboard bindings found"})
			return
		}

		httpx.JSON(w, http.StatusOK, result)
	}
}

// @Summary  Update the keyboard bindings
// @Tags     keyboard-bindings
// @Security BearerAuth
// @Accept   json
// @Produce  json
// @Param    bindings body dtos.KeyboardBindingsRequest true "Bindings to save"
// @Success  200 {object} dtos.KeyboardBindingsResponse
// @Failure  400 {object} dtos.ErrorResponse "Invalid request body"
// @Failure  401 {object} dtos.ErrorResponse
// @Failure  500 {object} dtos.ErrorResponse
// @Router   /api/note-game/keyboard-bindings [put]
func handleUpdateKeyboardBindings(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}

		req, problems, err := httpx.DecodeValid[dtos.KeyboardBindingsRequest](r)
		if err != nil {
			httpx.DecodeError(w, problems)
			return
		}

		result, err := services.UpsertKeyboardBindings(r.Context(), q, userID, &req)
		if err != nil {
			logger.Error("failed to update keyboard bindings", "error", err, "userID", userID)
			httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Failed to update keyboard bindings"})
			return
		}

		httpx.JSON(w, http.StatusOK, result)
	}
}

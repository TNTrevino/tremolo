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

// RegisterKeyboardBindingsRoutes registers the keyboard bindings routes.
// All routes are protected with JWT authentication middleware.
func RegisterKeyboardBindingsRoutes(mux *http.ServeMux, q database.Querier) {
	mux.Handle("GET /api/note-game/keyboard-bindings",
		middleware.RequireAuth(handleGetKeyboardBindings(q)))
	mux.Handle("PUT /api/note-game/keyboard-bindings",
		middleware.RequireAuth(handleUpdateKeyboardBindings(q)))
}

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

func handleUpdateKeyboardBindings(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}

		req, err := httpx.Decode[dtos.KeyboardBindingsRequest](r)
		if err != nil {
			httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": "Invalid request body"})
			return
		}

		result, err := services.UpsertKeyboardBindings(r.Context(), q, userID, &req)
		if err != nil {
			var validationErr *services.ValidationError
			if errors.As(err, &validationErr) {
				httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": validationErr.Unwrap().Error()})
				return
			}
			logger.Error("failed to update keyboard bindings", "error", err, "userID", userID)
			httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Failed to update keyboard bindings"})
			return
		}

		httpx.JSON(w, http.StatusOK, result)
	}
}

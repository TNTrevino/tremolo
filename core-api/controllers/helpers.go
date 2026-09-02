package controllers

import (
	"errors"
	"net/http"
	"strconv"

	"sight-reading/httpx"
	"sight-reading/middleware"
	"sight-reading/services"
)

// respondClassError maps service errors to HTTP statuses shared by all
// class/assignment handlers.
func respondClassError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, services.ErrForbidden):
		httpx.JSON(w, http.StatusForbidden, httpx.M{"error": "Forbidden"})
	case errors.Is(err, services.ErrNotFound):
		httpx.JSON(w, http.StatusNotFound, httpx.M{"error": "Not found"})
	case errors.Is(err, services.ErrValidation):
		httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": "Invalid request"})
	default:
		httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Something went wrong"})
	}
}

func authedUserID(w http.ResponseWriter, r *http.Request) (int, bool) {
	userID, err := middleware.AuthenticatedUserID(r)
	if err != nil {
		httpx.JSON(w, http.StatusUnauthorized, httpx.M{"error": "Unauthorized"})
		return 0, false
	}
	return userID, true
}

func pathID(w http.ResponseWriter, r *http.Request, name string) (int, bool) {
	id, err := strconv.Atoi(r.PathValue(name))
	if err != nil || id <= 0 {
		httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": "Invalid id"})
		return 0, false
	}
	return id, true
}

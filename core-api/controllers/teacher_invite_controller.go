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

// RegisterTeacherInviteRoutes registers the teacher invite code routes.
// Minting a code is the only thing that lets a self-service signup claim
// the TEACHER role, so both routes go through RequireAuth and adminOnly --
// the same pair the admin user-management routes use.
func RegisterTeacherInviteRoutes(mux *http.ServeMux, q database.Querier) {
	mux.Handle("POST /api/admin/teacher-invites", middleware.RequireAuth(adminOnly(q, handleCreateTeacherInvite(q))))
	mux.Handle("GET /api/admin/teacher-invites", middleware.RequireAuth(adminOnly(q, handleListTeacherInvites(q))))
}

// handleCreateTeacherInvite handles POST /api/admin/teacher-invites.
// Protected: Requires JWT authentication (ADMIN role, via adminOnly)
// @Summary  Mint a teacher invite code
// @Tags     admin
// @Security BearerAuth
// @Accept   json
// @Produce  json
// @Param    invite body dtos.CreateTeacherInviteRequest true "Invite code options"
// @Success  201 {object} dtos.TeacherInviteResponse
// @Failure  400 {object} dtos.ErrorResponse "Invalid request body"
// @Failure  401 {object} dtos.ErrorResponse
// @Failure  403 {object} dtos.ErrorResponse "Forbidden"
// @Failure  500 {object} dtos.ErrorResponse
// @Router   /api/admin/teacher-invites [post]
func handleCreateTeacherInvite(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		adminID, ok := authedUserID(w, r)
		if !ok {
			return
		}

		req, problems, err := httpx.DecodeValid[dtos.CreateTeacherInviteRequest](r)
		if err != nil {
			httpx.DecodeError(w, problems)
			return
		}

		result, err := services.CreateTeacherInvite(r.Context(), q, adminID, &req)
		if err != nil {
			logger.Error("failed to create teacher invite code", "error", err)
			httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Failed to create invite code"})
			return
		}

		httpx.JSON(w, http.StatusCreated, result)
	}
}

// handleListTeacherInvites handles GET /api/admin/teacher-invites.
// Protected: Requires JWT authentication (ADMIN role, via adminOnly)
// @Summary  List teacher invite codes
// @Tags     admin
// @Security BearerAuth
// @Produce  json
// @Success  200 {array}  dtos.TeacherInviteResponse
// @Failure  401 {object} dtos.ErrorResponse
// @Failure  403 {object} dtos.ErrorResponse "Forbidden"
// @Failure  500 {object} dtos.ErrorResponse
// @Router   /api/admin/teacher-invites [get]
func handleListTeacherInvites(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		result, err := services.ListTeacherInvites(r.Context(), q)
		if err != nil {
			logger.Error("failed to list teacher invite codes", "error", err)
			httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Failed to retrieve invite codes"})
			return
		}

		httpx.JSON(w, http.StatusOK, result)
	}
}

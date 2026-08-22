// Package controllers handles the routing of our service functions
package controllers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	dtos "sight-reading/DTOs"
	"sight-reading/database"
	"sight-reading/httpx"
	"sight-reading/logger"
	"sight-reading/middleware"
	"sight-reading/services"
)

// RegisterAdminRoutes registers the admin user-management routes (list/get
// teachers and students, create a user). All routes require authentication
// and are further restricted to the ADMIN role by adminOnly.
func RegisterAdminRoutes(mux *http.ServeMux, q database.Querier) {
	mux.Handle("GET /teachers", middleware.RequireAuth(adminOnly(q, handleGetTeachers(q))))
	mux.Handle("GET /teacher/{id}", middleware.RequireAuth(adminOnly(q, handleGetTeacher(q))))
	mux.Handle("GET /students", middleware.RequireAuth(adminOnly(q, handleGetStudents(q))))
	mux.Handle("GET /student/{id}", middleware.RequireAuth(adminOnly(q, handleGetStudent(q))))
	mux.Handle("POST /user", middleware.RequireAuth(adminOnly(q, handleCreateUser(q))))
}

// adminOnly restricts a handler to authenticated callers with the ADMIN
// role via services.RequireAdmin. A missing user ID and a non-admin role
// both respond with an identical 403, so nothing about the caller's
// account leaks; an unexpected lookup failure is logged and reported as
// a 500 so a DB outage is not mistaken for a permissions problem.
func adminOnly(q database.Querier, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID, err := middleware.AuthenticatedUserID(r)
		if err != nil {
			httpx.JSON(w, http.StatusForbidden, httpx.M{"error": "Forbidden"})
			return
		}

		if err := services.RequireAdmin(r.Context(), q, userID); err != nil {
			if errors.Is(err, services.ErrForbidden) {
				httpx.JSON(w, http.StatusForbidden, httpx.M{"error": "Forbidden"})
				return
			}
			logger.Error("failed to check admin role", "error", err, "userID", userID)
			httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Something went wrong"})
			return
		}

		next.ServeHTTP(w, r)
	})
}

// idPathParam parses the "{id}" path param the way the pre-refactor
// handlers did: any non-numeric value is a 422, and negative/zero values
// are passed through (the service reports them not found rather than
// rejecting the shape).
func idPathParam(w http.ResponseWriter, r *http.Request) (int, bool) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		httpx.JSON(w, http.StatusUnprocessableEntity, httpx.M{
			"error":   true,
			"message": "Invalid request body",
		})
		return 0, false
	}
	return id, true
}

// handleCreateUser handles POST /user: admin-created users (student/teacher/
// parent -- ADMIN creation is rejected).
// Protected: Requires JWT authentication (ADMIN role, via adminOnly)
// @Summary  Create a user
// @Tags     admin
// @Security BearerAuth
// @Accept   json
// @Produce  json
// @Param    user body dtos.CreateUserRequest true "User to create"
// @Success  201 {object} map[string]interface{} "body, status"
// @Failure  400 {object} dtos.ErrorResponse "Invalid role"
// @Failure  403 {object} dtos.ErrorResponse "Creating ADMIN users is not allowed"
// @Failure  422 {object} dtos.ErrorResponse "Invalid request body or field validation failed"
// @Failure  500 {object} dtos.ErrorResponse
// @Router   /user [post]
func handleCreateUser(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		reqBody, err := httpx.Decode[dtos.CreateUserRequest](r)
		if err != nil {
			httpx.JSON(w, http.StatusUnprocessableEntity, httpx.M{
				"error":    true,
				"message":  "Invalid json body",
				"scenario": "TS.1",
			})
			return
		}

		result, err := services.CreateUser(r.Context(), q, &reqBody)
		if err != nil {
			switch {
			case errors.Is(err, services.ErrValidation):
				httpx.JSON(w, http.StatusUnprocessableEntity, httpx.M{
					"error":    strings.TrimPrefix(err.Error(), services.ErrValidation.Error()+": "),
					"message":  "Information invalid",
					"scenario": "TS.2",
				})
			case errors.Is(err, services.ErrForbidden):
				httpx.JSON(w, http.StatusForbidden, httpx.M{
					"error": "Creating ADMIN users is not allowed",
				})
			case errors.Is(err, services.ErrInvalidRole):
				httpx.JSON(w, http.StatusBadRequest, httpx.M{
					"error":   "Invalid role",
					"message": "Role not found",
				})
			default:
				logger.Error("failed to create user", "error", err)
				httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Failed to create user"})
			}
			return
		}

		httpx.JSON(w, http.StatusCreated, httpx.M{
			"body":   result,
			"status": "teacher created sucessfully",
		})
	}
}

// handleGetStudents handles GET /students.
// Protected: Requires JWT authentication (ADMIN role, via adminOnly)
// @Summary  List students
// @Tags     admin
// @Security BearerAuth
// @Produce  json
// @Success  200 {array}  dtos.User
// @Failure  403 {object} dtos.ErrorResponse
// @Failure  500 {object} dtos.ErrorResponse
// @Router   /students [get]
func handleGetStudents(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		students, err := services.GetStudents(r.Context(), q)
		if err != nil {
			httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Failed to retrieve students"})
			return
		}
		httpx.JSON(w, http.StatusOK, students)
	}
}

// handleGetStudent handles GET /student/{id}.
// Protected: Requires JWT authentication (ADMIN role, via adminOnly)
// @Summary  Get a student
// @Tags     admin
// @Security BearerAuth
// @Produce  json
// @Param    id path int true "Student user ID"
// @Success  200 {object} dtos.User
// @Failure  403 {object} dtos.ErrorResponse
// @Failure  404 {object} dtos.ErrorResponse
// @Failure  422 {object} dtos.ErrorResponse "Invalid id"
// @Router   /student/{id} [get]
func handleGetStudent(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, ok := idPathParam(w, r)
		if !ok {
			return
		}

		student, err := services.GetStudent(r.Context(), q, id)
		if err != nil {
			if errors.Is(err, services.ErrNotFound) {
				httpx.JSON(w, http.StatusNotFound, httpx.M{"error": "Student not found"})
				return
			}
			httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Failed to retrieve student"})
			return
		}
		httpx.JSON(w, http.StatusOK, student)
	}
}

// handleGetTeachers handles GET /teachers.
// Protected: Requires JWT authentication (ADMIN role, via adminOnly)
// @Summary  List teachers
// @Tags     admin
// @Security BearerAuth
// @Produce  json
// @Success  200 {array}  dtos.User
// @Failure  403 {object} dtos.ErrorResponse
// @Failure  500 {object} dtos.ErrorResponse
// @Router   /teachers [get]
func handleGetTeachers(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		teachers, err := services.GetTeachers(r.Context(), q)
		if err != nil {
			httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Failed to retrieve teachers"})
			return
		}
		httpx.JSON(w, http.StatusOK, teachers)
	}
}

// handleGetTeacher handles GET /teacher/{id}.
// Protected: Requires JWT authentication (ADMIN role, via adminOnly)
// @Summary  Get a teacher
// @Tags     admin
// @Security BearerAuth
// @Produce  json
// @Param    id path int true "Teacher user ID"
// @Success  200 {object} dtos.User
// @Failure  403 {object} dtos.ErrorResponse
// @Failure  404 {object} dtos.ErrorResponse
// @Failure  422 {object} dtos.ErrorResponse "Invalid id"
// @Router   /teacher/{id} [get]
func handleGetTeacher(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, ok := idPathParam(w, r)
		if !ok {
			return
		}

		teacher, err := services.GetTeacher(r.Context(), q, id)
		if err != nil {
			if errors.Is(err, services.ErrNotFound) {
				httpx.JSON(w, http.StatusNotFound, httpx.M{
					"error":   true,
					"message": "not found",
				})
				return
			}
			httpx.JSON(w, http.StatusInternalServerError, httpx.M{
				"error":   true,
				"message": "Something went wrong",
			})
			return
		}
		httpx.JSON(w, http.StatusOK, teacher)
	}
}

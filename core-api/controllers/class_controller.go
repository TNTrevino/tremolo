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

// RegisterClassRoutes registers class + assignment routes. All routes
// require auth; teacher-only rules are enforced in the service layer
// (role + ownership checks), not by separate middleware.
func RegisterClassRoutes(mux *http.ServeMux, q database.Querier) {
	mux.Handle("POST /api/classes", middleware.RequireAuth(handleCreateClass(q)))
	mux.Handle("GET /api/classes", middleware.RequireAuth(handleListTeacherClasses(q)))
	mux.Handle("GET /api/classes/joined", middleware.RequireAuth(handleListStudentClasses(q)))
	mux.Handle("POST /api/classes/join", middleware.RequireAuth(handleJoinClass(q)))
	mux.Handle("GET /api/classes/{id}/roster", middleware.RequireAuth(handleGetClassRoster(q)))
	mux.Handle("DELETE /api/classes/{id}", middleware.RequireAuth(handleArchiveClass(q)))
	mux.Handle("DELETE /api/classes/{id}/students/{studentId}", middleware.RequireAuth(handleRemoveStudentFromClass(q)))
	mux.Handle("POST /api/classes/{id}/assignments", middleware.RequireAuth(handleCreateAssignment(q)))
	mux.Handle("GET /api/classes/{id}/assignments", middleware.RequireAuth(handleListClassAssignments(q)))

	mux.Handle("GET /api/assignments", middleware.RequireAuth(handleListStudentAssignments(q)))
	mux.Handle("GET /api/assignments/{id}/results", middleware.RequireAuth(handleGetAssignmentResults(q)))
	mux.Handle("GET /api/assignments/{id}/attempts/{studentId}", middleware.RequireAuth(handleGetAssignmentAttempts(q)))
	mux.Handle("DELETE /api/assignments/{id}", middleware.RequireAuth(handleDeleteAssignment(q)))
}

// handleCreateClass creates a class owned by the caller.
// Protected: Requires JWT authentication (TEACHER role)
func handleCreateClass(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}

		req, err := httpx.Decode[dtos.CreateClassRequest](r)
		if err != nil {
			httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": "Invalid request body"})
			return
		}

		result, err := services.CreateClass(r.Context(), q, userID, &req)
		if err != nil {
			respondClassError(w, err)
			return
		}
		httpx.JSON(w, http.StatusCreated, result)
	}
}

// handleListTeacherClasses lists the caller's owned classes.
// Protected: Requires JWT authentication
func handleListTeacherClasses(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}

		result, err := services.ListTeacherClasses(r.Context(), q, userID)
		if err != nil {
			respondClassError(w, err)
			return
		}
		httpx.JSON(w, http.StatusOK, result)
	}
}

// handleListStudentClasses lists the classes the caller has joined.
// Protected: Requires JWT authentication
func handleListStudentClasses(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}

		result, err := services.ListStudentClasses(r.Context(), q, userID)
		if err != nil {
			respondClassError(w, err)
			return
		}
		httpx.JSON(w, http.StatusOK, result)
	}
}

// handleJoinClass adds the caller to the class matching the posted join code.
// Protected: Requires JWT authentication
func handleJoinClass(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}

		req, err := httpx.Decode[dtos.JoinClassRequest](r)
		if err != nil {
			httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": "Invalid request body"})
			return
		}

		result, err := services.JoinClass(r.Context(), q, userID, &req)
		if err != nil {
			if errors.Is(err, services.ErrNotFound) {
				httpx.JSON(w, http.StatusNotFound, httpx.M{"error": "No class with that join code"})
				return
			}
			respondClassError(w, err)
			return
		}
		httpx.JSON(w, http.StatusOK, result)
	}
}

// handleGetClassRoster lists the students in a class the caller owns.
// Protected: Requires JWT authentication (owning teacher)
func handleGetClassRoster(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}
		classID, ok := pathID(w, r, "id")
		if !ok {
			return
		}

		result, err := services.GetClassRoster(r.Context(), q, userID, classID)
		if err != nil {
			respondClassError(w, err)
			return
		}
		httpx.JSON(w, http.StatusOK, result)
	}
}

// handleArchiveClass soft-deletes a class the caller owns.
// Protected: Requires JWT authentication (owning teacher)
func handleArchiveClass(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}
		classID, ok := pathID(w, r, "id")
		if !ok {
			return
		}

		if err := services.ArchiveClass(r.Context(), q, userID, classID); err != nil {
			respondClassError(w, err)
			return
		}
		httpx.JSON(w, http.StatusOK, httpx.M{"message": "Class archived"})
	}
}

// handleRemoveStudentFromClass removes a student (teacher) or leaves (student).
// Protected: Requires JWT authentication
func handleRemoveStudentFromClass(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}
		classID, ok := pathID(w, r, "id")
		if !ok {
			return
		}
		studentID, ok := pathID(w, r, "studentId")
		if !ok {
			return
		}

		err := services.RemoveStudentFromClass(r.Context(), q, userID, classID, studentID)
		if err != nil {
			respondClassError(w, err)
			return
		}
		httpx.JSON(w, http.StatusOK, httpx.M{"message": "Student removed"})
	}
}

// handleCreateAssignment creates an assignment on a class the caller owns.
// Protected: Requires JWT authentication (owning teacher)
func handleCreateAssignment(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}
		classID, ok := pathID(w, r, "id")
		if !ok {
			return
		}

		req, err := httpx.Decode[dtos.CreateAssignmentRequest](r)
		if err != nil {
			httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": "Invalid request body"})
			return
		}

		result, err := services.CreateAssignment(r.Context(), q, userID, classID, &req)
		if err != nil {
			respondClassError(w, err)
			return
		}
		httpx.JSON(w, http.StatusCreated, result)
	}
}

// handleListClassAssignments lists a class's assignments for its owner.
// Protected: Requires JWT authentication (owning teacher)
func handleListClassAssignments(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}
		classID, ok := pathID(w, r, "id")
		if !ok {
			return
		}

		result, err := services.ListClassAssignments(r.Context(), q, userID, classID)
		if err != nil {
			respondClassError(w, err)
			return
		}
		httpx.JSON(w, http.StatusOK, result)
	}
}

// handleListStudentAssignments lists the caller's assignments with progress.
// Protected: Requires JWT authentication
func handleListStudentAssignments(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}

		result, err := services.ListStudentAssignments(r.Context(), q, userID)
		if err != nil {
			respondClassError(w, err)
			return
		}
		httpx.JSON(w, http.StatusOK, result)
	}
}

// handleGetAssignmentResults returns the teacher's per-student results grid.
// Protected: Requires JWT authentication (owning teacher)
func handleGetAssignmentResults(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}
		assignmentID, ok := pathID(w, r, "id")
		if !ok {
			return
		}

		result, err := services.GetAssignmentResults(r.Context(), q, userID, assignmentID)
		if err != nil {
			respondClassError(w, err)
			return
		}
		httpx.JSON(w, http.StatusOK, result)
	}
}

// handleGetAssignmentAttempts returns one student's attempt history on an
// assignment, oldest to newest.
// Protected: Requires JWT authentication (owning teacher/admin or the
// student themself)
func handleGetAssignmentAttempts(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}
		assignmentID, ok := pathID(w, r, "id")
		if !ok {
			return
		}
		studentID, ok := pathID(w, r, "studentId")
		if !ok {
			return
		}

		result, err := services.GetAssignmentAttempts(r.Context(), q, userID, assignmentID, studentID)
		if err != nil {
			respondClassError(w, err)
			return
		}
		httpx.JSON(w, http.StatusOK, result)
	}
}

// handleDeleteAssignment removes an assignment on a class the caller owns.
// Protected: Requires JWT authentication (owning teacher)
func handleDeleteAssignment(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := authedUserID(w, r)
		if !ok {
			return
		}
		assignmentID, ok := pathID(w, r, "id")
		if !ok {
			return
		}

		if err := services.DeleteAssignment(r.Context(), q, userID, assignmentID); err != nil {
			respondClassError(w, err)
			return
		}
		httpx.JSON(w, http.StatusOK, httpx.M{"message": "Assignment deleted"})
	}
}

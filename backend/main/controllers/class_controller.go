package controllers

import (
	"errors"
	"net/http"
	"strconv"

	dtos "sight-reading/DTOs"
	"sight-reading/database"
	"sight-reading/middleware"
	"sight-reading/services"

	"github.com/gin-gonic/gin"
)

// SetupClassRoutes initializes class + assignment routes. All routes
// require auth; teacher-only rules are enforced in the service layer
// (role + ownership checks), not by separate middleware.
func SetupClassRoutes(router *gin.Engine) {
	classes := router.Group("/api/classes")
	classes.Use(middleware.AuthMiddleware())
	{
		classes.POST("", CreateClass)
		classes.GET("", ListTeacherClasses)
		classes.GET("/joined", ListStudentClasses)
		classes.POST("/join", JoinClass)
		classes.GET("/:id/roster", GetClassRoster)
		classes.DELETE("/:id", ArchiveClass)
		classes.DELETE("/:id/students/:studentId", RemoveStudentFromClass)
		classes.POST("/:id/assignments", CreateAssignment)
		classes.GET("/:id/assignments", ListClassAssignments)
	}

	assignments := router.Group("/api/assignments")
	assignments.Use(middleware.AuthMiddleware())
	{
		assignments.GET("", ListStudentAssignments)
		assignments.GET("/:id/results", GetAssignmentResults)
		assignments.DELETE("/:id", DeleteAssignment)
	}
}

// respondClassError maps service errors to HTTP statuses shared by all
// class/assignment handlers.
func respondClassError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, services.ErrForbidden):
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
	case errors.Is(err, services.ErrNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "Not found"})
	case errors.Is(err, services.ErrValidation):
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Something went wrong"})
	}
}

func authedUserID(c *gin.Context) (int, bool) {
	userID, err := middleware.GetAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return 0, false
	}
	return userID, true
}

func pathID(c *gin.Context, name string) (int, bool) {
	id, err := strconv.Atoi(c.Param(name))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid id"})
		return 0, false
	}
	return id, true
}

// CreateClass creates a class owned by the caller.
// Protected: Requires JWT authentication (TEACHER role)
func CreateClass(c *gin.Context) {
	userID, ok := authedUserID(c)
	if !ok {
		return
	}

	var req dtos.CreateClassRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	if err := req.Validate(); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := services.CreateClass(c.Request.Context(), database.Queries, userID, &req)
	if err != nil {
		respondClassError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

// ListTeacherClasses lists the caller's owned classes.
// Protected: Requires JWT authentication
func ListTeacherClasses(c *gin.Context) {
	userID, ok := authedUserID(c)
	if !ok {
		return
	}

	result, err := services.ListTeacherClasses(c.Request.Context(), database.Queries, userID)
	if err != nil {
		respondClassError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// ListStudentClasses lists the classes the caller has joined.
// Protected: Requires JWT authentication
func ListStudentClasses(c *gin.Context) {
	userID, ok := authedUserID(c)
	if !ok {
		return
	}

	result, err := services.ListStudentClasses(c.Request.Context(), database.Queries, userID)
	if err != nil {
		respondClassError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// JoinClass adds the caller to the class matching the posted join code.
// Protected: Requires JWT authentication
func JoinClass(c *gin.Context) {
	userID, ok := authedUserID(c)
	if !ok {
		return
	}

	var req dtos.JoinClassRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	if err := req.Validate(); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := services.JoinClass(c.Request.Context(), database.Queries, userID, &req)
	if err != nil {
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "No class with that join code"})
			return
		}
		respondClassError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// GetClassRoster lists the students in a class the caller owns.
// Protected: Requires JWT authentication (owning teacher)
func GetClassRoster(c *gin.Context) {
	userID, ok := authedUserID(c)
	if !ok {
		return
	}
	classID, ok := pathID(c, "id")
	if !ok {
		return
	}

	result, err := services.GetClassRoster(c.Request.Context(), database.Queries, userID, classID)
	if err != nil {
		respondClassError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// ArchiveClass soft-deletes a class the caller owns.
// Protected: Requires JWT authentication (owning teacher)
func ArchiveClass(c *gin.Context) {
	userID, ok := authedUserID(c)
	if !ok {
		return
	}
	classID, ok := pathID(c, "id")
	if !ok {
		return
	}

	if err := services.ArchiveClass(c.Request.Context(), database.Queries, userID, classID); err != nil {
		respondClassError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Class archived"})
}

// RemoveStudentFromClass removes a student (teacher) or leaves (student).
// Protected: Requires JWT authentication
func RemoveStudentFromClass(c *gin.Context) {
	userID, ok := authedUserID(c)
	if !ok {
		return
	}
	classID, ok := pathID(c, "id")
	if !ok {
		return
	}
	studentID, ok := pathID(c, "studentId")
	if !ok {
		return
	}

	err := services.RemoveStudentFromClass(c.Request.Context(), database.Queries, userID, classID, studentID)
	if err != nil {
		respondClassError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Student removed"})
}

// CreateAssignment creates an assignment on a class the caller owns.
// Protected: Requires JWT authentication (owning teacher)
func CreateAssignment(c *gin.Context) {
	userID, ok := authedUserID(c)
	if !ok {
		return
	}
	classID, ok := pathID(c, "id")
	if !ok {
		return
	}

	var req dtos.CreateAssignmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	if err := req.Validate(); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := services.CreateAssignment(c.Request.Context(), database.Queries, userID, classID, &req)
	if err != nil {
		respondClassError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

// ListClassAssignments lists a class's assignments for its owner.
// Protected: Requires JWT authentication (owning teacher)
func ListClassAssignments(c *gin.Context) {
	userID, ok := authedUserID(c)
	if !ok {
		return
	}
	classID, ok := pathID(c, "id")
	if !ok {
		return
	}

	result, err := services.ListClassAssignments(c.Request.Context(), database.Queries, userID, classID)
	if err != nil {
		respondClassError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// ListStudentAssignments lists the caller's assignments with progress.
// Protected: Requires JWT authentication
func ListStudentAssignments(c *gin.Context) {
	userID, ok := authedUserID(c)
	if !ok {
		return
	}

	result, err := services.ListStudentAssignments(c.Request.Context(), database.Queries, userID)
	if err != nil {
		respondClassError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// GetAssignmentResults returns the teacher's per-student results grid.
// Protected: Requires JWT authentication (owning teacher)
func GetAssignmentResults(c *gin.Context) {
	userID, ok := authedUserID(c)
	if !ok {
		return
	}
	assignmentID, ok := pathID(c, "id")
	if !ok {
		return
	}

	result, err := services.GetAssignmentResults(c.Request.Context(), database.Queries, userID, assignmentID)
	if err != nil {
		respondClassError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// DeleteAssignment removes an assignment on a class the caller owns.
// Protected: Requires JWT authentication (owning teacher)
func DeleteAssignment(c *gin.Context) {
	userID, ok := authedUserID(c)
	if !ok {
		return
	}
	assignmentID, ok := pathID(c, "id")
	if !ok {
		return
	}

	if err := services.DeleteAssignment(c.Request.Context(), database.Queries, userID, assignmentID); err != nil {
		respondClassError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Assignment deleted"})
}

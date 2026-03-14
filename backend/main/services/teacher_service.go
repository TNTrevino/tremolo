package services

import (
	"database/sql"
	"net/http"
	"sight-reading/database"
	"sight-reading/database/generated"
	"sight-reading/logger"
	"strconv"

	dtos "sight-reading/DTOs"

	"github.com/gin-gonic/gin"
)

func CreateUser(c *gin.Context) {
	var reqBody dtos.User

	err := c.ShouldBindJSON(&reqBody)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error":    true,
			"message":  "Invalid json body",
			"scenario": "TS.1",
		})
		return
	}

	err = reqBody.ValidateUser()
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error":    reqBody.ValidateUser().Error(),
			"message":  "Information invalid",
			"scenario": "TS.2",
		})
		return
	}

	ctx := c.Request.Context()

	roleID, err := database.Queries.GetRoleIDByName(ctx, string(reqBody.Role))
	if err != nil {
		logger.Error("Failed to resolve role", "error", err.Error(), "role", reqBody.Role)
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid role",
			"message": "Role not found",
		})
		return
	}

	params := generated.CreateUserParams{
		FirstName: reqBody.FirstName,
		LastName:  reqBody.LastName,
		Email:     sql.NullString{String: reqBody.Email, Valid: reqBody.Email != ""},
		Password:  reqBody.PasswordHash,
		RoleID:    roleID,
	}

	if reqBody.SchoolID != 0 {
		params.SchoolID = sql.NullInt32{Int32: int32(reqBody.SchoolID), Valid: true}
	}

	createdUser, err := database.Queries.CreateUser(ctx, params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":    err.Error(),
			"message":  "The school is most likely not found",
			"scenario": "TS.3",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"body":   convertCreateUserRowToUserResponse(createdUser, string(reqBody.Role)),
		"status": "teacher created sucessfully",
	})
}

func GetStudents(c *gin.Context) {
	ctx := c.Request.Context()

	users, err := database.Queries.GetUsersByRole(ctx, string(dtos.Student))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   err.Error(),
			"message": "not updated",
		})
		return
	}

	c.JSON(http.StatusOK, convertGetUsersByRoleRowsToDTO(users))
}

func GetStudent(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error":   true,
			"message": "Invalid request body",
		})
		return
	}

	ctx := c.Request.Context()

	params := generated.GetUserByRoleAndIDParams{
		Name: string(dtos.Student),
		ID:   int32(id),
	}

	user, err := database.Queries.GetUserByRoleAndID(ctx, params)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   err.Error(),
			"message": "not found",
		})
		return
	}

	c.JSON(http.StatusOK, convertGetUserByRoleAndIDRowToDTO(user))
}

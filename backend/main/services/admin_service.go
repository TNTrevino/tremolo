package services

import (
	"database/sql"
	"net/http"
	dtos "sight-reading/DTOs"
	"sight-reading/database"
	"strconv"

	"github.com/gin-gonic/gin"
)

func GetTeachers(c *gin.Context) {
	ctx := c.Request.Context()

	users, err := database.Queries.GetUsersByRole(ctx, sql.NullString{String: string(dtos.Teacher), Valid: true})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   err.Error(),
			"message": "not able to get all the teachers",
		})
		return
	}

	c.JSON(http.StatusOK, convertGetUsersByRoleRowsToDTO(users))
}

func GetTeacher(c *gin.Context) {
	idSrt := c.Param("id")
	id, err := strconv.Atoi(idSrt)
	if err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error":   true,
			"message": "Invalid request body",
		})
		return
	}

	ctx := c.Request.Context()

	user, err := database.Queries.GetUserByID(ctx, int32(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   true,
			"message": "not found",
		})
		return
	}

	teacher := convertGetUserByIDRowToDTO(user)
	userID := int16(user.ID)
	teacher.ID = &userID

	c.JSON(http.StatusOK, teacher)
}

func GetSchoolTeachers(c *gin.Context) {
	ctx := c.Request.Context()

	users, err := database.Queries.GetUsersByRole(ctx, sql.NullString{String: string(dtos.Teacher), Valid: true})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   err.Error(),
			"message": "not able to get all the teachers",
		})
		return
	}

	c.JSON(http.StatusOK, convertGetUsersByRoleRowsToDTO(users))
}

func GetSchoolStudents(c *gin.Context) {
	ctx := c.Request.Context()

	users, err := database.Queries.GetUsersByRole(ctx, sql.NullString{String: string(dtos.Student), Valid: true})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   err.Error(),
			"message": "not able to get all the students",
		})
		return
	}

	c.JSON(http.StatusOK, convertGetUsersByRoleRowsToDTO(users))
}

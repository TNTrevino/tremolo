package services

import (
	"net/http"
	"sight-reading/repositories"
	"strconv"

	dtos "sight-reading/DTOs"

	"github.com/gin-gonic/gin"
)

func GetTeachers(c *gin.Context) {
	userRepo := repositories.NewUserRepository()

	users, err := userRepo.GetUsersByRole("TEACHER")
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   err.Error(),
			"message": "not able to get all the teachers",
		})
		return
	}

	var teachers []dtos.User
	for _, user := range users {
		teacher := dtos.User{
			FirstName: user.FirstName,
			LastName:  user.LastName,
			Role:      dtos.Role(user.Role),
		}
		if user.SchoolID.Valid {
			teacher.SchoolID = int16(user.SchoolID.Int64)
		}
		teachers = append(teachers, teacher)
	}

	c.JSON(http.StatusOK, teachers)
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

	userRepo := repositories.NewUserRepository()

	user, err := userRepo.GetUserByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   true,
			"message": "not found",
		})
		return
	}

	userID := int16(user.ID)
	teacher := dtos.User{
		ID:        &userID,
		FirstName: user.FirstName,
		LastName:  user.LastName,
	}

	c.JSON(http.StatusOK, teacher)
}

func GetSchoolTeachers(c *gin.Context) {
	userRepo := repositories.NewUserRepository()

	users, err := userRepo.GetUsersByRole("TEACHER")
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   err.Error(),
			"message": "not able to get all the teachers",
		})
		return
	}

	var teachers []dtos.User
	for _, user := range users {
		teacher := dtos.User{
			FirstName: user.FirstName,
			LastName:  user.LastName,
		}
		if user.SchoolID.Valid {
			teacher.SchoolID = int16(user.SchoolID.Int64)
		}
		teachers = append(teachers, teacher)
	}

	c.JSON(http.StatusOK, teachers)
}

func GetSchoolStudents(c *gin.Context) {
	userRepo := repositories.NewUserRepository()

	users, err := userRepo.GetUsersByRole("STUDENT")
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   err.Error(),
			"message": "not able to get all the teachers",
		})
		return
	}

	var students []dtos.User
	for _, user := range users {
		student := dtos.User{
			FirstName: user.FirstName,
			LastName:  user.LastName,
		}
		if user.SchoolID.Valid {
			student.SchoolID = int16(user.SchoolID.Int64)
		}
		students = append(students, student)
	}

	c.JSON(http.StatusOK, students)
}

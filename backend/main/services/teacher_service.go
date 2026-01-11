package services

import (
	"net/http"
	"sight-reading/repositories"
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

	userRepo := repositories.NewUserRepository()

	user := repositories.User{
		FirstName: reqBody.FirstName,
		LastName:  reqBody.LastName,
		Role:      string(reqBody.Role),
	}

	if reqBody.SchoolID != 0 {
		user.SchoolID.Valid = true
		user.SchoolID.Int64 = int64(reqBody.SchoolID)
	}

	createdUser, err := userRepo.CreateUser(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":    err.Error(),
			"message":  "The school is most likely not found",
			"scenario": "TS.3",
		})
		return
	}

	response := dtos.User{
		FirstName: createdUser.FirstName,
		LastName:  createdUser.LastName,
		Role:      dtos.Role(createdUser.Role),
	}

	if createdUser.SchoolID.Valid {
		response.SchoolID = int16(createdUser.SchoolID.Int64)
	}

	c.JSON(http.StatusCreated, gin.H{
		"body":   response,
		"status": "teacher created sucessfully",
	})
}

func UpdateTeacher(c *gin.Context) {
}

func GetStudents(c *gin.Context) {
	userRepo := repositories.NewUserRepository()

	users, err := userRepo.GetUsersByRole("STUDENT")
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   err.Error(),
			"message": "not updated",
		})
		return
	}

	var students []dtos.User
	for _, user := range users {
		student := dtos.User{
			FirstName: user.FirstName,
			LastName:  user.LastName,
			Role:      dtos.Role(user.Role),
		}
		if user.SchoolID.Valid {
			student.SchoolID = int16(user.SchoolID.Int64)
		}
		students = append(students, student)
	}

	c.JSON(http.StatusOK, students)
}

func GetStudent(c *gin.Context) {
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

	user, err := userRepo.GetUserByRoleAndID("STUDENT", id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   err.Error(),
			"message": "not found",
		})
		return
	}

	student := dtos.User{
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Role:      dtos.Role(user.Role),
	}
	if user.SchoolID.Valid {
		student.SchoolID = int16(user.SchoolID.Int64)
	}

	c.JSON(http.StatusOK, student)
}

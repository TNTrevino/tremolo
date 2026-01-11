// Package controllers handles the routing of our service functions
package controllers

import (
	"sight-reading/services"

	"github.com/gin-gonic/gin"
)

func SetupTeacherRoutes(router *gin.Engine) {
	router.GET("/teachers", services.GetTeachers)
	router.GET("/teacher/:id", services.GetTeacher)
	router.GET("/students", services.GetStudents)
	router.GET("/student/:id", services.GetStudent)
	router.POST("/user", services.CreateUser)
}

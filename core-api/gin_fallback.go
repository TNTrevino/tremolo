package main

import (
	"net/http"

	"sight-reading/controllers"

	"github.com/gin-gonic/gin"
)

// ginFallback builds a gin engine carrying the routes that have not moved
// to net/http yet.
//
// This file exists only so the migration can land one domain at a time.
// Mounting gin under the ServeMux means every commit in the migration
// leaves a service that builds, serves every route, and passes its tests,
// instead of one commit that moves all eleven domains at once.
//
// Remove a Setup call from here in the same commit that adds the domain's
// Register call to controllers/routes.go. When this list is empty, delete
// the file, the mux.Handle("/", ...) line in server.go, and the gin
// dependency.
//
// gin.New rather than gin.Default: NewServer already wraps this handler
// in middleware.Recover and middleware.RequestLog, and gin's own Recovery
// and Logger would duplicate both.
func ginFallback() http.Handler {
	router := gin.New()

	controllers.SetupAuthRoutes(router)

	return router
}

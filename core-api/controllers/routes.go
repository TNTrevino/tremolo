package controllers

import (
	"net/http"

	"sight-reading/database"
)

// RegisterRoutes attaches every domain's routes to mux.
//
// Each domain keeps its own Register function next to its handlers, so a
// change to one domain touches one file. This list is the one place that
// says which domains exist, which is what a single routes.go is for.
//
// The Querier arrives here as an argument and is handed down to each
// domain, so no handler reads a package global to reach the database.
func RegisterRoutes(mux *http.ServeMux, q database.Querier) {
	RegisterHealthRoutes(mux)
	RegisterAuthRoutes(mux, q)
	RegisterAdminRoutes(mux, q)
	RegisterTeacherInviteRoutes(mux, q)
	RegisterChartRoutes(mux, q)
	RegisterUserInfoRoutes(mux, q)
	RegisterNoteGameRoutes(mux, q)
	RegisterNoteGameSettingsRoutes(mux, q)
	RegisterGameSettingsRoutes(mux, q)
	RegisterKeyboardBindingsRoutes(mux, q)
	RegisterFriendsRoutes(mux, q)
	RegisterClassRoutes(mux, q)
	RegisterAccountRoutes(mux, q)
}

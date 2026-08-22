package controllers

import (
	"net/http"

	"sight-reading/database"
)

// RegisterRoutes attaches every converted domain's routes to mux.
//
// Each domain keeps its own Register function next to its handlers, so a
// change to one domain touches one file. This list is the one place that
// says which domains exist and in what order they register, which is what
// a single routes.go is for.
//
// The Querier arrives here as an argument and is handed down to each
// domain, so no handler reads a package global to reach the database.
//
// While the migration off gin runs, a domain missing from this list is
// still served by the gin engine main.go mounts underneath. The list is
// complete when gin_fallback.go is deleted.
func RegisterRoutes(mux *http.ServeMux, q database.Querier) {
	RegisterHealthRoutes(mux)
	RegisterUserInfoRoutes(mux, q)
	RegisterNoteGameRoutes(mux, q)
	RegisterNoteGameSettingsRoutes(mux, q)
	RegisterGameSettingsRoutes(mux, q)
	RegisterKeyboardBindingsRoutes(mux, q)
	RegisterFriendsRoutes(mux, q)
	RegisterClassRoutes(mux, q)
	RegisterChartRoutes(mux, q)
}

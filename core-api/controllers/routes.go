package controllers

import "net/http"

// RegisterRoutes attaches every converted domain's routes to mux.
//
// Each domain keeps its own Register function next to its handlers, so a
// change to one domain touches one file. This list is the one place that
// says which domains exist and in what order they register, which is what
// a single routes.go is for.
//
// While the migration off gin runs, a domain missing from this list is
// still served by the gin engine main.go mounts underneath. The list is
// complete when gin_fallback.go is deleted.
func RegisterRoutes(mux *http.ServeMux) {
}

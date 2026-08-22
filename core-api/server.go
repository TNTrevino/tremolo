package main

import (
	"net/http"

	"sight-reading/controllers"
	"sight-reading/middleware"
)

// NewServer builds the service's HTTP handler and returns it.
//
// It takes its dependencies as arguments and returns a plain
// http.Handler, so a test can build the whole service, hand it to
// httptest.NewServer, and exercise it end to end without a port, a
// package global, or a running main.
//
// The middleware order is outside-in, and it matters:
//
//  1. Recover, so a panic anywhere below still answers the caller.
//  2. RequestLog, so the log line records the status Recover produced.
//  3. CORS, so a rejected origin costs nothing further down.
func NewServer(allowedOrigins []string) http.Handler {
	mux := http.NewServeMux()
	controllers.RegisterRoutes(mux)

	// Anything the converted routes do not match falls through to gin.
	// A ServeMux prefers the most specific matching pattern, so a
	// converted route always wins over this catch-all. Delete both this
	// line and gin_fallback.go when the last domain converts.
	mux.Handle("/", ginFallback())

	var handler http.Handler = mux
	handler = middleware.CORS(allowedOrigins)(handler)
	handler = middleware.RequestLog(handler)
	handler = middleware.Recover(handler)
	return handler
}

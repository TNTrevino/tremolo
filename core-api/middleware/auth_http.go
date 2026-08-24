package middleware

import (
	"context"
	"errors"
	"net/http"

	"sight-reading/httpx"
)

// contextKey is unexported so no other package can construct one. A
// plain string key (e.g. "userID") could be read or overwritten by any
// package by accident; a pointer to an unexported struct cannot collide
// with a key from another package.
type contextKey struct{ name string }

var userIDContextKey = &contextKey{"userID"}

// RequireAuth rejects a request that does not carry a valid access token,
// and hands a request that does to next with the caller's user ID in its
// context. It answers 401 with either "Unauthorized" or, for a refresh
// token presented in place of an access token, "Invalid token type".
func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, err := accessTokenClaims(r.Header.Get("Authorization"))
		if err != nil {
			message := "Unauthorized"
			if errors.Is(err, errWrongTokenType) {
				message = "Invalid token type"
			}
			httpx.JSON(w, http.StatusUnauthorized, httpx.M{"error": message})
			return
		}

		next.ServeHTTP(w, r.WithContext(withUserID(r.Context(), claims.UserID)))
	})
}

// withUserID returns a copy of ctx carrying userID. RequireAuth is the
// only writer: a handler downstream reads the ID back through
// AuthenticatedUserID, so nothing outside this file needs to set it.
func withUserID(ctx context.Context, userID int) context.Context {
	return context.WithValue(ctx, userIDContextKey, userID)
}

// AuthenticatedUserID returns the user ID RequireAuth put on the request.
// It errors when the handler is reachable without RequireAuth in front of
// it, so a route that loses its middleware fails closed rather than
// serving user 0's data.
func AuthenticatedUserID(r *http.Request) (int, error) {
	userID, ok := r.Context().Value(userIDContextKey).(int)
	if !ok {
		return 0, errors.New("Unauthorized")
	}
	return userID, nil
}

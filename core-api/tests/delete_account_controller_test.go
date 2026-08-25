package tests

import (
	"bytes"
	"context"
	"database/sql"
	"errors"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	dtos "sight-reading/DTOs"
	"sight-reading/database"
	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/assert"
)

// TestDeleteAccountRoute_Unauthenticated_Returns401 covers the missing
// bearer token.
func TestDeleteAccountRoute_Unauthenticated_Returns401(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	router := accountTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodDelete, "/api/users/1", "", dtos.DeleteAccountRequest{
		Password:          "irrelevant",
		EmailConfirmation: "irrelevant@example.com",
	}))

	assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())

	var response map[string]any
	testutil.ParseJSONResponse(t, w, &response)
	assert.Equal(t, "Unauthorized", response["error"])
}

// TestDeleteAccountRoute_OtherUsersID_Returns403 covers the self-only
// rule against a REAL second account, AND that the rejection is not
// merely cosmetic: the target account must still be there afterward. An
// authz bug that returned 403 but deleted the account anyway (or a bug
// that deleted the CALLER's own account instead of the path target)
// must not pass this test silently.
func TestDeleteAccountRoute_OtherUsersID_Returns403(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	callerEmail := testutil.UniqueEmail(t, "delete_account_route_other_caller")
	callerID := testutil.CreateTestUserWithDefaults(t, callerEmail, "STUDENT")
	callerToken := testAccessToken(t, callerID)

	targetEmail := testutil.UniqueEmail(t, "delete_account_route_other_target")
	targetID := testutil.CreateTestUserWithDefaults(t, targetEmail, "STUDENT")

	router := accountTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodDelete, "/api/users/"+strconv.Itoa(targetID), callerToken, dtos.DeleteAccountRequest{
		Password:          "irrelevant",
		EmailConfirmation: targetEmail,
	}))

	assert.Equal(t, http.StatusForbidden, w.Code, "Response body: %s", w.Body.String())

	var response map[string]any
	testutil.ParseJSONResponse(t, w, &response)
	assert.Equal(t, "Access denied", response["error"])

	_, err := database.Queries.GetUserByID(context.Background(), int32(targetID))
	assert.NoError(t, err, "a rejected cross-account delete must leave the target account in place")
}

// TestDeleteAccountRoute_InvalidBody_Returns400 covers unparseable JSON.
func TestDeleteAccountRoute_InvalidBody_Returns400(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "delete_account_route_invalid_body")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	router := accountTestRouter()
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodDelete, "/api/users/"+strconv.Itoa(userID), bytes.NewBufferString("invalid json"))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var response map[string]any
	testutil.ParseJSONResponse(t, w, &response)
	assert.Equal(t, "Invalid request body", response["error"])
}

// TestDeleteAccountRoute_NonNumericID_Returns400 covers a path id that
// isn't a number, same as export's sibling test for this shared
// requireSelf helper.
func TestDeleteAccountRoute_NonNumericID_Returns400(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "delete_account_route_badid")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	router := accountTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodDelete, "/api/users/abc", token, dtos.DeleteAccountRequest{
		Password:          "irrelevant",
		EmailConfirmation: email,
	}))

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var response map[string]any
	testutil.ParseJSONResponse(t, w, &response)
	assert.Equal(t, "Invalid user ID parameter", response["error"])
}

// TestDeleteAccountRoute_Success_Returns200 is the happy path: the
// caller deletes their own account with the correct password and email
// confirmation.
func TestDeleteAccountRoute_Success_Returns200(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	password := "Old-Passw0rd!"
	email := testutil.UniqueEmail(t, "delete_account_route_success")
	userID := testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  password,
		FirstName: "Test",
		LastName:  "User",
		Role:      "STUDENT",
	})
	token := testAccessToken(t, userID)

	router := accountTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodDelete, "/api/users/"+strconv.Itoa(userID), token, dtos.DeleteAccountRequest{
		Password:          password,
		EmailConfirmation: email,
	}))

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	var response map[string]any
	testutil.ParseJSONResponse(t, w, &response)
	assert.Equal(t, "Account deleted", response["message"])

	_, err := database.Queries.GetUserByID(context.Background(), int32(userID))
	assert.True(t, errors.Is(err, sql.ErrNoRows), "the account must actually be gone")
}

package tests

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	dtos "sight-reading/DTOs"
	"sight-reading/controllers"
	"sight-reading/database"
	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/assert"
)

// accountTestRouter builds a router with the account routes AND the auth
// routes registered, mirroring how NewServer wires both
// controllers.RegisterAccountRoutes and controllers.RegisterAuthRoutes.
// Both are needed here because POST /api/auth/confirm-email-change is
// registered by RegisterAuthRoutes (see RegisterAccountRoutes's doc
// comment) even though it belongs to this feature.
func accountTestRouter() *http.ServeMux {
	mux := http.NewServeMux()
	controllers.RegisterAccountRoutes(mux, database.Queries)
	controllers.RegisterAuthRoutes(mux, database.Queries)
	return mux
}

// TestAccountRoutesRegister is a smoke test that RegisterAccountRoutes'
// pattern set is valid: http.ServeMux panics at registration time on a
// malformed or conflicting pattern, so this only needs to not panic (same
// precedent as TestClassAndChartRoutesRegister in
// tests/class_controller_test.go).
func TestAccountRoutesRegister(t *testing.T) {
	t.Parallel()

	mux := http.NewServeMux()
	controllers.RegisterAccountRoutes(mux, database.Queries)
}

// ---------- PUT /api/users/{userId}/password ----------

func TestChangePasswordRoute_Unauthenticated_Returns401(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	router := accountTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPut, "/api/users/1/password", "", dtos.ChangePasswordRequest{
		CurrentPassword: "Old-Passw0rd!",
		NewPassword:     "New-Passw0rd!",
	}))

	assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())

	var response map[string]any
	testutil.ParseJSONResponse(t, w, &response)
	assert.Equal(t, "Unauthorized", response["error"])
}

func TestChangePasswordRoute_OtherUsersID_Returns403(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "change_password_route_other")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	otherUserID := userID + 1

	router := accountTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPut, "/api/users/"+strconv.Itoa(otherUserID)+"/password", token, dtos.ChangePasswordRequest{
		CurrentPassword: "Old-Passw0rd!",
		NewPassword:     "New-Passw0rd!",
	}))

	assert.Equal(t, http.StatusForbidden, w.Code, "Response body: %s", w.Body.String())

	var response map[string]any
	testutil.ParseJSONResponse(t, w, &response)
	assert.Equal(t, "Access denied", response["error"])
}

func TestChangePasswordRoute_Success_Returns200(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "change_password_route_success")
	oldPassword := "Old-Passw0rd!"
	userID := testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  oldPassword,
		FirstName: "Test",
		LastName:  "User",
		Role:      "STUDENT",
	})
	token := testAccessToken(t, userID)

	router := accountTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPut, "/api/users/"+strconv.Itoa(userID)+"/password", token, dtos.ChangePasswordRequest{
		CurrentPassword: oldPassword,
		NewPassword:     "New-Passw0rd!",
	}))

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	var response dtos.ChangePasswordResponse
	testutil.ParseJSONResponse(t, w, &response)
	assert.Equal(t, "Password updated.", response.Message)
}

// TestChangePasswordRoute_WrongCurrentPassword_Returns400 pins the 400,
// not 401. frontend/src/app/core/interceptors/refresh.interceptor.ts
// retries any core-api 401 (other than the session endpoints) once,
// after refreshing the access token -- a 401 here would burn a refresh
// round trip and silently double-submit the same wrong password before
// the interceptor gives up. See services/account_service.go's
// ErrIncorrectPassword and this controller's respondAccountError.
func TestChangePasswordRoute_WrongCurrentPassword_Returns400(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "change_password_route_wrong")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	router := accountTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPut, "/api/users/"+strconv.Itoa(userID)+"/password", token, dtos.ChangePasswordRequest{
		CurrentPassword: "definitely-wrong",
		NewPassword:     "New-Passw0rd!",
	}))

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var response map[string]any
	testutil.ParseJSONResponse(t, w, &response)
	assert.Equal(t, "Current password is incorrect", response["error"])
}

func TestChangePasswordRoute_InvalidBody_Returns400(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "change_password_route_invalid_body")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	router := accountTestRouter()
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/users/"+strconv.Itoa(userID)+"/password", bytes.NewBufferString("invalid json"))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var response map[string]any
	testutil.ParseJSONResponse(t, w, &response)
	assert.Equal(t, "Invalid request body", response["error"])
}

// ---------- POST /api/users/{userId}/email ----------

func TestChangeEmailRoute_Unauthenticated_Returns401(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	router := accountTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPost, "/api/users/1/email", "", dtos.ChangeEmailRequest{
		CurrentPassword: "Old-Passw0rd!",
		NewEmail:        "new@example.com",
	}))

	assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())

	var response map[string]any
	testutil.ParseJSONResponse(t, w, &response)
	assert.Equal(t, "Unauthorized", response["error"])
}

func TestChangeEmailRoute_Success_Returns200(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	password := "Old-Passw0rd!"
	email := testutil.UniqueEmail(t, "change_email_route_success")
	newEmail := testutil.UniqueEmail(t, "change_email_route_success_new")
	userID := testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  password,
		FirstName: "Test",
		LastName:  "User",
		Role:      "STUDENT",
	})
	t.Cleanup(func() { testutil.DeleteQueuedEmails(t, newEmail) })
	token := testAccessToken(t, userID)

	router := accountTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPost, "/api/users/"+strconv.Itoa(userID)+"/email", token, dtos.ChangeEmailRequest{
		CurrentPassword: password,
		NewEmail:        newEmail,
	}))

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	var response dtos.ChangeEmailResponse
	testutil.ParseJSONResponse(t, w, &response)
	assert.Equal(t, "Check your new address for a confirmation link.", response.Message)
}

func TestChangeEmailRoute_TakenAddress_Returns409(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	password := "Old-Passw0rd!"
	email := testutil.UniqueEmail(t, "change_email_route_taken_requester")
	userID := testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  password,
		FirstName: "Test",
		LastName:  "User",
		Role:      "STUDENT",
	})
	token := testAccessToken(t, userID)
	takenEmail := testutil.UniqueEmail(t, "change_email_route_taken_target")
	testutil.CreateTestUserWithDefaults(t, takenEmail, "STUDENT")

	router := accountTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPost, "/api/users/"+strconv.Itoa(userID)+"/email", token, dtos.ChangeEmailRequest{
		CurrentPassword: password,
		NewEmail:        takenEmail,
	}))

	assert.Equal(t, http.StatusConflict, w.Code, "Response body: %s", w.Body.String())

	var response map[string]any
	testutil.ParseJSONResponse(t, w, &response)
	assert.Equal(t, "That email address is already in use.", response["error"])
}

// ---------- POST /api/auth/confirm-email-change ----------

func TestConfirmEmailChangeRoute_BadToken_Returns400(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	router := accountTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPost, "/api/auth/confirm-email-change", "", dtos.ConfirmEmailChangeRequest{
		Token: "never-issued-token",
	}))

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var response map[string]any
	testutil.ParseJSONResponse(t, w, &response)
	assert.Equal(t, "This email confirmation link is invalid or has expired.", response["error"])
}

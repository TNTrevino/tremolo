package tests

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"testing"

	dtos "sight-reading/DTOs"
	"sight-reading/database"
	"sight-reading/database/generated"
	"sight-reading/services"
	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// createOAuthTestUser creates a user with a google_id via CreateOAuthUser, registers
// cleanup, seeds keyboard bindings, and returns the user ID.
func createOAuthTestUser(t *testing.T, email, googleID, firstName, lastName string) int {
	t.Helper()
	testutil.SetupTestDB(t)

	roleID, err := database.Queries.GetRoleIDByName(context.Background(), "BASIC")
	require.NoError(t, err, "failed to resolve BASIC role")

	row, err := database.Queries.CreateOAuthUser(context.Background(), generated.CreateOAuthUserParams{
		FirstName: firstName,
		LastName:  lastName,
		Email:     sql.NullString{String: email, Valid: true},
		GoogleID:  sql.NullString{String: googleID, Valid: true},
		RoleID:    roleID,
		SchoolID:  sql.NullInt32{Valid: false},
	})
	require.NoError(t, err, "failed to create OAuth test user")

	uid := int(row.ID)
	t.Cleanup(func() { testutil.DeleteTestUser(t, uid) })

	err = services.CreateDefaultKeyboardBindings(context.Background(), database.Queries, uid)
	require.NoError(t, err, "failed to seed keyboard bindings for OAuth test user")

	return uid
}

// googleReqBody is a convenience helper to build a valid GoogleCallbackRequest.
func googleReqBody() dtos.GoogleCallbackRequest {
	return dtos.GoogleCallbackRequest{
		Code:        "test-code",
		RedirectURI: "http://localhost/callback",
	}
}

func TestGoogleCallback_NewUser(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "google_new")
	sub := fmt.Sprintf("google-sub-%s", email)

	services.SetTokenVerifier(testutil.NewMockGoogleVerifier(&services.GoogleClaims{
		Sub:           sub,
		Email:         email,
		EmailVerified: true,
		GivenName:     "New",
		FamilyName:    "User",
	}))

	c, w := testutil.CreateGinContextWithBody(http.MethodPost, "/api/auth/google/callback", googleReqBody())
	services.GoogleCallback(c)

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	var resp dtos.LoginResponse
	testutil.ParseJSONResponse(t, w, &resp)

	assert.NotEmpty(t, resp.AccessToken, "expected access token")
	assert.NotEmpty(t, resp.RefreshToken, "expected refresh token")
	assert.Equal(t, email, resp.User.Email)
	assert.Equal(t, "BASIC", resp.User.Role)
	assert.Equal(t, "New", resp.User.FirstName)
	assert.Equal(t, "User", resp.User.LastName)
	assert.False(t, resp.AccountLinked, "new user should not have account_linked=true")

	// Verify keyboard bindings were seeded
	bindings, err := database.Queries.GetKeyboardBindings(context.Background(), int32(resp.User.ID))
	require.NoError(t, err, "keyboard bindings should exist for new OAuth user")
	assert.Equal(t, int32(resp.User.ID), bindings.UserID)

	// Cleanup: the service created this user, so we need to remove it
	t.Cleanup(func() { testutil.DeleteTestUser(t, resp.User.ID) })
}

func TestGoogleCallback_ReturningUser(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "google_returning")
	sub := fmt.Sprintf("google-sub-%s", email)

	// Pre-create a user with google_id
	existingUID := createOAuthTestUser(t, email, sub, "Returning", "Googler")

	services.SetTokenVerifier(testutil.NewMockGoogleVerifier(&services.GoogleClaims{
		Sub:           sub,
		Email:         email,
		EmailVerified: true,
		GivenName:     "Returning",
		FamilyName:    "Googler",
	}))

	c, w := testutil.CreateGinContextWithBody(http.MethodPost, "/api/auth/google/callback", googleReqBody())
	services.GoogleCallback(c)

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	var resp dtos.LoginResponse
	testutil.ParseJSONResponse(t, w, &resp)

	assert.NotEmpty(t, resp.AccessToken)
	assert.NotEmpty(t, resp.RefreshToken)
	assert.Equal(t, existingUID, resp.User.ID)
	assert.Equal(t, email, resp.User.Email)
}

func TestGoogleCallback_AccountLinking(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "google_link")
	sub := fmt.Sprintf("google-sub-%s", email)

	// Create an email/password user (no google_id)
	testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  "TestPass123!",
		FirstName: "Link",
		LastName:  "Me",
		Role:      "STUDENT",
	})

	services.SetTokenVerifier(testutil.NewMockGoogleVerifier(&services.GoogleClaims{
		Sub:           sub,
		Email:         email,
		EmailVerified: true,
		GivenName:     "Link",
		FamilyName:    "Me",
	}))

	c, w := testutil.CreateGinContextWithBody(http.MethodPost, "/api/auth/google/callback", googleReqBody())
	services.GoogleCallback(c)

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	var resp dtos.LoginResponse
	testutil.ParseJSONResponse(t, w, &resp)

	assert.True(t, resp.AccountLinked, "account_linked should be true when linking existing email user")
	assert.NotEmpty(t, resp.AccessToken)
	assert.NotEmpty(t, resp.RefreshToken)

	// Verify google_id is now set in the database
	oauthRow, err := database.Queries.GetUserByEmailForOAuth(
		context.Background(),
		sql.NullString{String: email, Valid: true},
	)
	require.NoError(t, err)
	assert.True(t, oauthRow.GoogleID.Valid, "google_id should be set after linking")
	assert.Equal(t, sub, oauthRow.GoogleID.String)
}

func TestGoogleCallback_InvalidCode(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	services.SetTokenVerifier(&testutil.MockGoogleTokenVerifier{
		ExchangeCodeFn: func(code, redirectURI string) (string, error) {
			return "", fmt.Errorf("invalid authorization code")
		},
		VerifyIDTokenFn: func(idToken string) (*services.GoogleClaims, error) {
			return nil, fmt.Errorf("should not be called")
		},
	})

	c, w := testutil.CreateGinContextWithBody(http.MethodPost, "/api/auth/google/callback", googleReqBody())
	services.GoogleCallback(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Contains(t, resp["error"], "Invalid authorization code")
}

func TestGoogleCallback_MissingCode(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	// POST with empty body
	c, w := testutil.CreateGinContextWithBody(http.MethodPost, "/api/auth/google/callback", dtos.GoogleCallbackRequest{})
	services.GoogleCallback(c)

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())
}

func TestGoogleCallback_UnverifiedEmail(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "google_unverified")

	services.SetTokenVerifier(testutil.NewMockGoogleVerifier(&services.GoogleClaims{
		Sub:           "unverified-sub",
		Email:         email,
		EmailVerified: false,
	}))

	c, w := testutil.CreateGinContextWithBody(http.MethodPost, "/api/auth/google/callback", googleReqBody())
	services.GoogleCallback(c)

	assert.Equal(t, http.StatusForbidden, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Google email is not verified", resp["error"])
}

func TestGoogleCallback_ConflictGoogleID(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "google_conflict")
	existingSub := fmt.Sprintf("existing-sub-%s", email)
	newSub := fmt.Sprintf("new-sub-%s", email)

	// Create a user who already has a different google_id linked
	createOAuthTestUser(t, email, existingSub, "User", "Conflict")

	// Mock returns a NEW sub for the same email — the google_id lookup for newSub
	// will miss (no user with that sub), then the email lookup finds the user who
	// already has existingSub set, triggering the 409 conflict.
	services.SetTokenVerifier(testutil.NewMockGoogleVerifier(&services.GoogleClaims{
		Sub:           newSub,
		Email:         email,
		EmailVerified: true,
		GivenName:     "User",
		FamilyName:    "Conflict",
	}))

	c, w := testutil.CreateGinContextWithBody(http.MethodPost, "/api/auth/google/callback", googleReqBody())
	services.GoogleCallback(c)

	assert.Equal(t, http.StatusConflict, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Email is already linked to a different Google account", resp["error"])
}

func TestLinkGoogle_Success(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "link_google")
	sub := fmt.Sprintf("link-sub-%s", email)

	// Create an email/password user
	uid := testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  "TestPass123!",
		FirstName: "Link",
		LastName:  "Test",
		Role:      "STUDENT",
	})

	services.SetTokenVerifier(testutil.NewMockGoogleVerifier(&services.GoogleClaims{
		Sub:           sub,
		Email:         email,
		EmailVerified: true,
		GivenName:     "Link",
		FamilyName:    "Test",
	}))

	// Create an authenticated context with both userID and a JSON body
	c, w := testutil.CreateGinContextWithBody(http.MethodPost, "/api/auth/google/link", googleReqBody())
	c.Set("userID", uid)

	services.LinkGoogleAccount(c)

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Google account linked successfully", resp["message"])

	// Verify google_id is now set
	oauthRow, err := database.Queries.GetUserByEmailForOAuth(
		context.Background(),
		sql.NullString{String: email, Valid: true},
	)
	require.NoError(t, err)
	assert.True(t, oauthRow.GoogleID.Valid)
	assert.Equal(t, sub, oauthRow.GoogleID.String)
}

func TestGoogleCallback_AccountLinkedFlag(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	t.Run("new user has account_linked false", func(t *testing.T) {
		email := testutil.UniqueEmail(t, "flag_new")
		sub := fmt.Sprintf("flag-sub-new-%s", email)

		services.SetTokenVerifier(testutil.NewMockGoogleVerifier(&services.GoogleClaims{
			Sub:           sub,
			Email:         email,
			EmailVerified: true,
			GivenName:     "Flag",
			FamilyName:    "New",
		}))

		c, w := testutil.CreateGinContextWithBody(http.MethodPost, "/api/auth/google/callback", googleReqBody())
		services.GoogleCallback(c)

		require.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

		var resp dtos.LoginResponse
		testutil.ParseJSONResponse(t, w, &resp)
		assert.False(t, resp.AccountLinked, "new user should have account_linked=false")

		t.Cleanup(func() { testutil.DeleteTestUser(t, resp.User.ID) })
	})

	t.Run("linked user has account_linked true", func(t *testing.T) {
		email := testutil.UniqueEmail(t, "flag_link")
		sub := fmt.Sprintf("flag-sub-link-%s", email)

		// Create an email/password user first
		testutil.CreateTestUser(t, testutil.CreateTestUserParams{
			Email:     email,
			Password:  "TestPass123!",
			FirstName: "Flag",
			LastName:  "Link",
			Role:      "STUDENT",
		})

		services.SetTokenVerifier(testutil.NewMockGoogleVerifier(&services.GoogleClaims{
			Sub:           sub,
			Email:         email,
			EmailVerified: true,
			GivenName:     "Flag",
			FamilyName:    "Link",
		}))

		c, w := testutil.CreateGinContextWithBody(http.MethodPost, "/api/auth/google/callback", googleReqBody())
		services.GoogleCallback(c)

		require.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

		var resp dtos.LoginResponse
		testutil.ParseJSONResponse(t, w, &resp)
		assert.True(t, resp.AccountLinked, "linking existing user should have account_linked=true")
	})
}

func TestLinkGoogle_EmailMismatch(t *testing.T) {
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "link_mismatch")
	differentEmail := testutil.UniqueEmail(t, "link_mismatch_diff")
	sub := fmt.Sprintf("link-mismatch-sub-%s", email)

	// Create an email/password user
	uid := testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  "TestPass123!",
		FirstName: "Mismatch",
		LastName:  "Test",
		Role:      "STUDENT",
	})

	// Mock returns a DIFFERENT email than the user's
	services.SetTokenVerifier(testutil.NewMockGoogleVerifier(&services.GoogleClaims{
		Sub:           sub,
		Email:         differentEmail,
		EmailVerified: true,
		GivenName:     "Mismatch",
		FamilyName:    "Test",
	}))

	c, w := testutil.CreateGinContextWithBody(http.MethodPost, "/api/auth/google/link", googleReqBody())
	c.Set("userID", uid)

	services.LinkGoogleAccount(c)

	assert.Equal(t, http.StatusForbidden, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Google email does not match your account email", resp["error"])
}

func TestLinkGoogle_GoogleIDConflict(t *testing.T) {
	testutil.SetupTestDB(t)

	email1 := testutil.UniqueEmail(t, "link_conflict1")
	email2 := testutil.UniqueEmail(t, "link_conflict2")
	sub := fmt.Sprintf("link-conflict-sub-%s", email1)

	// Create user1 with this Google ID already linked
	createOAuthTestUser(t, email1, sub, "Already", "Linked")

	// Create user2 as email/password user
	uid2 := testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email2,
		Password:  "TestPass123!",
		FirstName: "Wants",
		LastName:  "Link",
		Role:      "STUDENT",
	})

	// Mock returns the same sub (already owned by user1) but with user2's email
	services.SetTokenVerifier(testutil.NewMockGoogleVerifier(&services.GoogleClaims{
		Sub:           sub,
		Email:         email2,
		EmailVerified: true,
		GivenName:     "Wants",
		FamilyName:    "Link",
	}))

	c, w := testutil.CreateGinContextWithBody(http.MethodPost, "/api/auth/google/link", googleReqBody())
	c.Set("userID", uid2)

	services.LinkGoogleAccount(c)

	assert.Equal(t, http.StatusConflict, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "This Google account is already linked to another user", resp["error"])
}

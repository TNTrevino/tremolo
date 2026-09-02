package tests

import (
	"net/http"
	"net/http/httptest"
	"testing"

	dtos "sight-reading/DTOs"
	"sight-reading/controllers"
	"sight-reading/database"
	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// teacherInviteTestRouter builds a mux with only the teacher-invite
// routes registered, mirroring how RegisterRoutes wires them.
func teacherInviteTestRouter() *http.ServeMux {
	mux := http.NewServeMux()
	controllers.RegisterTeacherInviteRoutes(mux, database.Queries)
	return mux
}

// TestTeacherInviteRoutes_RequireAuthAndAdminRole verifies both routes
// reject an anonymous caller and an authenticated non-admin. Minting
// invite codes is the whole gate on the TEACHER role, so a route that
// lost RequireAuth or adminOnly would hand that role to anyone.
func TestTeacherInviteRoutes_RequireAuthAndAdminRole(t *testing.T) {
	t.Parallel()

	routes := []struct {
		name   string
		method string
	}{
		{"CreateTeacherInvite", http.MethodPost},
		{"ListTeacherInvites", http.MethodGet},
	}

	for _, route := range routes {
		t.Run(route.name+"_Unauthenticated", func(t *testing.T) {
			t.Parallel()
			testutil.SetupTestDB(t)

			router := teacherInviteTestRouter()
			w := httptest.NewRecorder()
			router.ServeHTTP(w, bearerRequest(t, route.method, "/api/admin/teacher-invites", "", nil))

			assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())

			var resp map[string]any
			testutil.ParseJSONResponse(t, w, &resp)
			assert.Equal(t, "Unauthorized", resp["error"])
		})

		t.Run(route.name+"_NonAdmin", func(t *testing.T) {
			t.Parallel()
			testutil.SetupTestDB(t)

			email := testutil.UniqueEmail(t, "invite_route_nonadmin")
			userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
			token := testAccessToken(t, userID)

			router := teacherInviteTestRouter()
			w := httptest.NewRecorder()
			router.ServeHTTP(w, bearerRequest(t, route.method, "/api/admin/teacher-invites", token, nil))

			assert.Equal(t, http.StatusForbidden, w.Code, "Response body: %s", w.Body.String())

			var resp map[string]any
			testutil.ParseJSONResponse(t, w, &resp)
			assert.Equal(t, "Forbidden", resp["error"])
		})
	}
}

func TestCreateTeacherInviteRoute_MintsACode(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	adminID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "invite_route_admin"), "ADMIN")
	token := testAccessToken(t, adminID)

	router := teacherInviteTestRouter()
	w := httptest.NewRecorder()
	body := map[string]any{"note": "Jefferson MS pilot"}
	router.ServeHTTP(w, bearerRequest(t, http.MethodPost, "/api/admin/teacher-invites", token, body))

	require.Equal(t, http.StatusCreated, w.Code, "Response body: %s", w.Body.String())

	var resp dtos.TeacherInviteResponse
	testutil.ParseJSONResponse(t, w, &resp)
	deleteInviteCodeOnCleanup(t, resp.Code)

	assert.Len(t, resp.Code, dtos.TeacherInviteCodeLength)
	assert.Equal(t, "Jefferson MS pilot", resp.Note)
	assert.Equal(t, 1, resp.MaxUses)
	assert.Equal(t, 0, resp.UseCount)
}

func TestCreateTeacherInviteRoute_RejectsABadMaxUses(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	adminID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "invite_route_maxuses_admin"), "ADMIN")
	token := testAccessToken(t, adminID)

	router := teacherInviteTestRouter()
	w := httptest.NewRecorder()
	body := map[string]any{"max_uses": 999}
	router.ServeHTTP(w, bearerRequest(t, http.MethodPost, "/api/admin/teacher-invites", token, body))

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "MaxUses: must be between 1 and 100", resp["error"])
}

func TestListTeacherInvitesRoute_ReturnsMintedCodes(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	adminID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "invite_route_list_admin"), "ADMIN")
	token := testAccessToken(t, adminID)
	seeded := testutil.CreateTestTeacherInviteCode(t, testutil.CreateTestTeacherInviteCodeParams{
		Note: "seeded for the list route",
	})

	router := teacherInviteTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/admin/teacher-invites", token, nil))

	require.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	var resp []dtos.TeacherInviteResponse
	testutil.ParseJSONResponse(t, w, &resp)

	codes := make([]string, 0, len(resp))
	for _, invite := range resp {
		codes = append(codes, invite.Code)
	}
	assert.Contains(t, codes, seeded)
}

// ---------- POST /api/auth/register, the invite-code gate ----------

// TestRegisterRoute_TeacherWithoutCode_Returns400 pins the DTO's message
// on the wire: the frontend shows it verbatim under the field.
func TestRegisterRoute_TeacherWithoutCode_Returns400(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	router := authTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPost, "/api/auth/register", "", dtos.RegisterRequest{
		Email:     testutil.UniqueEmail(t, "invite_route_no_code"),
		Password:  "TestPass123!",
		FirstName: "Terry",
		LastName:  "Teacher",
		Role:      "TEACHER",
	}))

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Invite code is required for teacher accounts", resp["error"])
}

// TestRegisterRoute_TeacherWithBadCode_Returns400WithFieldMarker pins the
// "field" key. It is the wire contract the signup page routes on: with it
// the message lands under the invite-code input, without it in the page
// alert.
func TestRegisterRoute_TeacherWithBadCode_Returns400WithFieldMarker(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	router := authTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPost, "/api/auth/register", "", dtos.RegisterRequest{
		Email:      testutil.UniqueEmail(t, "invite_route_bad_code"),
		Password:   "TestPass123!",
		FirstName:  "Terry",
		LastName:   "Teacher",
		Role:       "TEACHER",
		InviteCode: "ZZZZZZZZ",
	}))

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "That invite code is not valid, has expired, or has already been used.", resp["error"])
	assert.Equal(t, "invite_code", resp["field"])
}

func TestRegisterRoute_TeacherWithGoodCode_Returns201(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	code := testutil.CreateTestTeacherInviteCode(t, testutil.CreateTestTeacherInviteCodeParams{})
	email := testutil.UniqueEmail(t, "invite_route_good_code")

	router := authTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPost, "/api/auth/register", "", dtos.RegisterRequest{
		Email:      email,
		Password:   "TestPass123!",
		FirstName:  "Terry",
		LastName:   "Teacher",
		Role:       "TEACHER",
		InviteCode: code,
	}))

	require.Equal(t, http.StatusCreated, w.Code, "Response body: %s", w.Body.String())

	var resp dtos.RegisterResponse
	testutil.ParseJSONResponse(t, w, &resp)
	t.Cleanup(func() { testutil.DeleteTestUser(t, resp.User.ID) })

	assert.Equal(t, "TEACHER", resp.User.Role)
	assert.Equal(t, int32(1), testutil.TeacherInviteUseCount(t, code))
}

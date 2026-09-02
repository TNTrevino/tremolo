package tests

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	dtos "sight-reading/DTOs"
	"sight-reading/database"
	"sight-reading/services"
	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// inviteCodeAlphabet mirrors joinCodeAlphabet in services/class_service.go,
// which is unexported. Minted codes must draw only from it: no 0/O and no
// 1/I/L, so a code survives being read aloud or copied off a whiteboard.
const inviteCodeAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

// deleteInviteCodeOnCleanup removes a code minted through the service,
// which hands back the code string rather than the row id.
func deleteInviteCodeOnCleanup(t *testing.T, code string) {
	t.Helper()
	t.Cleanup(func() {
		if database.Queries == nil {
			return
		}
		row, err := database.Queries.GetTeacherInviteCodeByCode(context.Background(), code)
		if err != nil {
			t.Logf("Warning: failed to look up minted code %q for cleanup: %v", code, err)
			return
		}
		if err := database.Queries.DeleteTeacherInviteCode(context.Background(), row.ID); err != nil {
			t.Logf("Warning: failed to delete minted code %q: %v", code, err)
		}
	})
}

// ---------- minting ----------

func TestCreateTeacherInvite_MintsAUsableCode(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	adminID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "invite_mint_admin"), "ADMIN")

	result, err := services.CreateTeacherInvite(context.Background(), database.Queries, adminID,
		&dtos.CreateTeacherInviteRequest{Note: "Ms. Rivera, Jefferson MS"})
	require.NoError(t, err)
	deleteInviteCodeOnCleanup(t, result.Code)

	assert.Len(t, result.Code, dtos.TeacherInviteCodeLength)
	for _, r := range result.Code {
		assert.Contains(t, inviteCodeAlphabet, string(r),
			"minted code %q uses a character outside the unambiguous alphabet", result.Code)
	}
	assert.Equal(t, "Ms. Rivera, Jefferson MS", result.Note)
	assert.Equal(t, 1, result.MaxUses, "MaxUses defaults to a single use")
	assert.Equal(t, 0, result.UseCount)
	assert.Nil(t, result.ExpiresAt, "a code with no expiry window never expires")

	row, err := database.Queries.GetTeacherInviteCodeByCode(context.Background(), result.Code)
	require.NoError(t, err)
	assert.Equal(t, int32(adminID), row.CreatedBy.Int32, "the minting admin is recorded")
}

func TestCreateTeacherInvite_HonorsMaxUsesAndExpiry(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	adminID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "invite_mint_opts_admin"), "ADMIN")

	before := time.Now()
	result, err := services.CreateTeacherInvite(context.Background(), database.Queries, adminID,
		&dtos.CreateTeacherInviteRequest{Note: "Fall cohort", MaxUses: 3, ExpiresInDays: 30})
	require.NoError(t, err)
	deleteInviteCodeOnCleanup(t, result.Code)

	assert.Equal(t, 3, result.MaxUses)
	assert.Equal(t, 0, result.UseCount)
	require.NotNil(t, result.ExpiresAt)
	assert.WithinDuration(t, before.Add(30*24*time.Hour), *result.ExpiresAt, time.Minute)
}

// ---------- redemption through Register ----------

// registerTeacher runs a TEACHER signup with the given code and cleans up
// whatever user it created.
func registerTeacher(t *testing.T, email, inviteCode string) (*dtos.RegisterResponse, error) {
	t.Helper()

	result, err := services.Register(context.Background(), database.Queries, dtos.RegisterRequest{
		Email:      email,
		Password:   "TestPass123!",
		FirstName:  "Terry",
		LastName:   "Teacher",
		Role:       "TEACHER",
		InviteCode: inviteCode,
	})
	if result != nil {
		t.Cleanup(func() { testutil.DeleteTestUser(t, result.User.ID) })
	}
	return result, err
}

func TestRegister_TeacherWithValidCode_CreatesTeacher(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	code := testutil.CreateTestTeacherInviteCode(t, testutil.CreateTestTeacherInviteCodeParams{})

	result, err := registerTeacher(t, testutil.UniqueEmail(t, "invite_register_ok"), code)

	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, "TEACHER", result.User.Role)
	assert.Equal(t, int32(1), testutil.TeacherInviteUseCount(t, code), "the signup spends one use")
}

func TestRegister_TeacherWithUnknownCode_IsRejected(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "invite_register_unknown")

	result, err := registerTeacher(t, email, "ZZZZZZZZ")

	require.Error(t, err)
	assert.ErrorIs(t, err, services.ErrInvalidInviteCode)
	assert.Nil(t, result)
	assert.Nil(t, testutil.GetTestUserByEmail(t, email), "no user row may exist for a rejected teacher signup")
}

func TestRegister_TeacherWithEmptyCode_IsRejected(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "invite_register_empty")

	// The DTO rejects this first in the real request path. The service
	// defends itself anyway: it is what any future non-HTTP caller hits.
	result, err := registerTeacher(t, email, "")

	require.Error(t, err)
	assert.ErrorIs(t, err, services.ErrInvalidInviteCode)
	assert.Nil(t, result)
	assert.Nil(t, testutil.GetTestUserByEmail(t, email))
}

func TestRegister_TeacherWithExpiredCode_IsRejected(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	expired := time.Now().Add(-time.Hour)
	code := testutil.CreateTestTeacherInviteCode(t, testutil.CreateTestTeacherInviteCodeParams{
		ExpiresAt: &expired,
	})

	_, err := registerTeacher(t, testutil.UniqueEmail(t, "invite_register_expired"), code)

	require.Error(t, err)
	assert.ErrorIs(t, err, services.ErrInvalidInviteCode)
	assert.Equal(t, int32(0), testutil.TeacherInviteUseCount(t, code))
}

func TestRegister_TeacherWithExhaustedCode_IsRejected(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	code := testutil.CreateTestTeacherInviteCode(t, testutil.CreateTestTeacherInviteCodeParams{MaxUses: 1})

	_, err := registerTeacher(t, testutil.UniqueEmail(t, "invite_register_first"), code)
	require.NoError(t, err)

	_, err = registerTeacher(t, testutil.UniqueEmail(t, "invite_register_second"), code)

	require.Error(t, err)
	assert.ErrorIs(t, err, services.ErrInvalidInviteCode)
	assert.Equal(t, int32(1), testutil.TeacherInviteUseCount(t, code), "the spent code stays at one use")
}

func TestRegister_MultiUseCode_AllowsExactlyMaxUses(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	code := testutil.CreateTestTeacherInviteCode(t, testutil.CreateTestTeacherInviteCodeParams{MaxUses: 2})

	_, err := registerTeacher(t, testutil.UniqueEmail(t, "invite_multi_one"), code)
	require.NoError(t, err)

	_, err = registerTeacher(t, testutil.UniqueEmail(t, "invite_multi_two"), code)
	require.NoError(t, err)

	_, err = registerTeacher(t, testutil.UniqueEmail(t, "invite_multi_three"), code)

	require.Error(t, err)
	assert.ErrorIs(t, err, services.ErrInvalidInviteCode)
	assert.Equal(t, int32(2), testutil.TeacherInviteUseCount(t, code))
}

// TestRegister_CodeIsCaseAndSpaceInsensitive covers a code retyped from
// an email: lowercased, and broken into groups with spaces.
func TestRegister_CodeIsCaseAndSpaceInsensitive(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	code := testutil.CreateTestTeacherInviteCode(t, testutil.CreateTestTeacherInviteCodeParams{})
	messy := " " + strings.ToLower(code[:4]) + " " + strings.ToLower(code[4:]) + " "

	result, err := registerTeacher(t, testutil.UniqueEmail(t, "invite_messy"), messy)

	require.NoError(t, err, "typed as %q", messy)
	assert.Equal(t, "TEACHER", result.User.Role)
	assert.Equal(t, int32(1), testutil.TeacherInviteUseCount(t, code))
}

// TestRegister_DuplicateEmailDoesNotConsumeTheCode pins the ordering
// inside Register: the redeem happens after the email-taken check, so a
// teacher who retries a signup they already completed does not burn a
// second use of their code.
func TestRegister_DuplicateEmailDoesNotConsumeTheCode(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "invite_dup_email")
	testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	code := testutil.CreateTestTeacherInviteCode(t, testutil.CreateTestTeacherInviteCodeParams{})

	_, err := registerTeacher(t, email, code)

	require.Error(t, err)
	assert.ErrorIs(t, err, services.ErrEmailTaken)
	assert.Equal(t, int32(0), testutil.TeacherInviteUseCount(t, code), "a taken email must not spend a use")
}

// TestRegister_OverlongPasswordDoesNotConsumeTheCode pins the release
// backstop (#269 review). Unlike TestRegister_DuplicateEmailDoesNotConsumeTheCode
// -- which fails BEFORE redeemTeacherInvite runs -- this fails AFTER: the
// code is legitimately redeemed, then HashPassword rejects a password over
// bcrypt's 72-byte limit with ErrPasswordTooLong.
//
// services.Register never calls RegisterRequest.Valid() itself -- the
// controller does, via httpx.DecodeValid, before the service ever sees the
// request (core-api/CLAUDE.md: "services take already-valid input and do
// not re-check request shapes"). So calling the service directly, as this
// test does, bypasses the new DTO-level length cap entirely and reaches
// HashPassword with the overlong password, exercising exactly the
// unreleased-code path the review flagged. Without the release backstop in
// Register's HashPassword-error branch, TeacherInviteUseCount ends at 1
// with no user ever created -- a single-use code burned for nothing.
func TestRegister_OverlongPasswordDoesNotConsumeTheCode(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	code := testutil.CreateTestTeacherInviteCode(t, testutil.CreateTestTeacherInviteCodeParams{})
	email := testutil.UniqueEmail(t, "invite_overlong_password")

	result, err := services.Register(context.Background(), database.Queries, dtos.RegisterRequest{
		Email:      email,
		Password:   strings.Repeat("a", 100),
		FirstName:  "Terry",
		LastName:   "Teacher",
		Role:       "TEACHER",
		InviteCode: code,
	})

	require.Error(t, err)
	assert.ErrorIs(t, err, services.ErrPasswordHashFailed)
	assert.Nil(t, result)
	assert.Nil(t, testutil.GetTestUserByEmail(t, email), "no user row may exist for a failed signup")
	assert.Equal(t, int32(0), testutil.TeacherInviteUseCount(t, code), "a failed signup must not burn the code it redeemed")
}

// TestRegister_StudentWithAnInviteCode_ConsumesNothing keeps the gate on
// the TEACHER path only: a student who somehow posts a real code still
// signs up as a student, and the code is untouched.
func TestRegister_StudentWithAnInviteCode_ConsumesNothing(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	code := testutil.CreateTestTeacherInviteCode(t, testutil.CreateTestTeacherInviteCodeParams{})

	result, err := services.Register(context.Background(), database.Queries, dtos.RegisterRequest{
		Email:      testutil.UniqueEmail(t, "invite_student_code"),
		Password:   "TestPass123!",
		FirstName:  "Sam",
		LastName:   "Student",
		Role:       "STUDENT",
		InviteCode: code,
	})

	require.NoError(t, err)
	require.NotNil(t, result)
	t.Cleanup(func() { testutil.DeleteTestUser(t, result.User.ID) })

	assert.Equal(t, "STUDENT", result.User.Role)
	assert.Equal(t, int32(0), testutil.TeacherInviteUseCount(t, code))
}

// TestRedeemTeacherInvite_ConcurrentRedemptionsRespectMaxUses is the
// decisive test for the design: eight signups race the single use of one
// code, and exactly one may win.
//
// A select-then-update would let several readers all see use_count = 0
// and all proceed. Redemption is one conditional UPDATE instead, so
// Postgres serializes the writers on the row and every loser's WHERE
// clause no longer matches.
func TestRedeemTeacherInvite_ConcurrentRedemptionsRespectMaxUses(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	const racers = 8
	code := testutil.CreateTestTeacherInviteCode(t, testutil.CreateTestTeacherInviteCodeParams{MaxUses: 1})

	emails := make([]string, racers)
	for i := range emails {
		emails[i] = testutil.UniqueEmail(t, "invite_race_"+strconv.Itoa(i))
	}
	t.Cleanup(func() {
		for _, email := range emails {
			if user := testutil.GetTestUserByEmail(t, email); user != nil {
				testutil.DeleteTestUser(t, int(user.ID))
			}
		}
	})

	// An indexed slot per goroutine: no mutex, and no ordering assumption.
	errs := make([]error, racers)
	start := make(chan struct{})
	var wg sync.WaitGroup
	wg.Add(racers)

	for i := range racers {
		go func() {
			defer wg.Done()
			<-start
			_, errs[i] = services.Register(context.Background(), database.Queries, dtos.RegisterRequest{
				Email:      emails[i],
				Password:   "TestPass123!",
				FirstName:  "Race",
				LastName:   "Teacher",
				Role:       "TEACHER",
				InviteCode: code,
			})
		}()
	}
	close(start)
	wg.Wait()

	won, rejected := 0, 0
	for i, err := range errs {
		switch {
		case err == nil:
			won++
		case errors.Is(err, services.ErrInvalidInviteCode):
			rejected++
		default:
			t.Fatalf("racer %d failed for an unexpected reason: %v", i, err)
		}
	}

	assert.Equal(t, 1, won, "exactly one racer may spend the single use")
	assert.Equal(t, racers-1, rejected)
	assert.Equal(t, int32(1), testutil.TeacherInviteUseCount(t, code))
}

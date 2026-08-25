package tests

import (
	"context"
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

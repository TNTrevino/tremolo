// Package testutil provides test utilities for teacher invite codes.
package testutil

import (
	"context"
	"database/sql"
	"strconv"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"sight-reading/database"
	"sight-reading/database/generated"
)

// inviteCodeSeq breaks ties between two codes minted inside the same
// nanosecond, which the clock alone cannot rule out under -race.
var inviteCodeSeq atomic.Uint64

// CreateTestTeacherInviteCodeParams holds parameters for seeding a
// teacher invite code. The zero value is a single-use code that never
// expires, which is what most tests want.
type CreateTestTeacherInviteCodeParams struct {
	MaxUses   int
	ExpiresAt *time.Time
	Note      string
}

// CreateTestTeacherInviteCode seeds a teacher invite code and returns the
// code string. The code is unique per call and uppercase -- the table's
// CHECK constraint rejects anything else -- but deliberately longer and
// uglier than a minted one, so a test that asserts on shape is reading
// services.CreateTeacherInvite rather than this helper.
//
// Cleanup deletes the row after the test.
func CreateTestTeacherInviteCode(t *testing.T, params CreateTestTeacherInviteCodeParams) string {
	t.Helper()
	SetupTestDB(t)

	maxUses := params.MaxUses
	if maxUses == 0 {
		maxUses = 1
	}

	expiresAt := sql.NullTime{}
	if params.ExpiresAt != nil {
		expiresAt = sql.NullTime{Time: *params.ExpiresAt, Valid: true}
	}

	code := uniqueTeacherInviteCode()
	row, err := database.Queries.CreateTeacherInviteCode(context.Background(), generated.CreateTeacherInviteCodeParams{
		Code:      code,
		Note:      params.Note,
		MaxUses:   int32(maxUses),
		ExpiresAt: expiresAt,
	})
	if err != nil {
		t.Fatalf("Failed to create test teacher invite code: %v", err)
	}

	t.Cleanup(func() {
		if database.Queries == nil {
			return
		}
		if err := database.Queries.DeleteTeacherInviteCode(context.Background(), row.ID); err != nil {
			t.Logf("Warning: Failed to delete test teacher invite code %d: %v", row.ID, err)
		}
	})

	return row.Code
}

// TeacherInviteUseCount reads back how many times a code has been
// redeemed. Tests assert on this rather than on a redeem call's return
// value, so an accidental double-increment cannot hide.
func TeacherInviteUseCount(t *testing.T, code string) int32 {
	t.Helper()
	SetupTestDB(t)

	row, err := database.Queries.GetTeacherInviteCodeByCode(context.Background(), code)
	if err != nil {
		t.Fatalf("Failed to read teacher invite code %q: %v", code, err)
	}
	return row.UseCount
}

// uniqueTeacherInviteCode builds an uppercase code that fits the
// varchar(16) column: a base-36 nanosecond stamp (12 chars) plus a
// 3-char sequence suffix.
func uniqueTeacherInviteCode() string {
	seq := inviteCodeSeq.Add(1) % 46656
	return strings.ToUpper(
		strconv.FormatInt(time.Now().UnixNano(), 36) +
			strconv.FormatUint(seq, 36),
	)
}

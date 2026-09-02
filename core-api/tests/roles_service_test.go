package tests

import (
	"context"
	"testing"

	"sight-reading/database"
	"sight-reading/services"
	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRequireAdmin_AdminRole_ReturnsNil(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "require_admin_admin")
	userID := testutil.CreateTestUserWithDefaults(t, email, "ADMIN")

	err := services.RequireAdmin(context.Background(), database.Queries, userID)
	require.NoError(t, err)
}

func TestRequireAdmin_NonAdminRole_ReturnsForbidden(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "require_admin_student")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	err := services.RequireAdmin(context.Background(), database.Queries, userID)
	assert.ErrorIs(t, err, services.ErrForbidden)
}

func TestRequireAdmin_UnknownUser_ReturnsForbidden(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	err := services.RequireAdmin(context.Background(), database.Queries, -1)
	assert.ErrorIs(t, err, services.ErrForbidden)
}

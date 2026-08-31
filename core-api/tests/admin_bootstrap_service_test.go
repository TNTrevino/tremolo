package tests

import (
	"context"
	"testing"

	"sight-reading/database"
	"sight-reading/services"
	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/require"
)

// These tests are deliberately not t.Parallel(): BootstrapAdmin reads the
// process-wide ADMIN_BOOTSTRAP_EMAIL variable via t.Setenv, which the
// testing package forbids combining with parallel tests (it would be a
// data race across the package's other parallel tests otherwise).

func TestBootstrapAdmin_PromotesStudentToAdmin(t *testing.T) {
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "bootstrap_admin_promote")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	t.Setenv("ADMIN_BOOTSTRAP_EMAIL", email)

	err := services.BootstrapAdmin(context.Background(), database.Queries)
	require.NoError(t, err)

	role, err := database.Queries.GetUserRole(context.Background(), int32(userID))
	require.NoError(t, err)
	require.Equal(t, "ADMIN", role)
}

func TestBootstrapAdmin_SecondRunIsNoOp(t *testing.T) {
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "bootstrap_admin_idempotent")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	t.Setenv("ADMIN_BOOTSTRAP_EMAIL", email)

	require.NoError(t, services.BootstrapAdmin(context.Background(), database.Queries))
	// Second run: the user is already ADMIN. Must stay a no-op, not an error.
	require.NoError(t, services.BootstrapAdmin(context.Background(), database.Queries))

	role, err := database.Queries.GetUserRole(context.Background(), int32(userID))
	require.NoError(t, err)
	require.Equal(t, "ADMIN", role)
}

func TestBootstrapAdmin_UnknownEmailIsNoOp(t *testing.T) {
	testutil.SetupTestDB(t)

	// Never inserted into the DB -- guaranteed not to match any user.
	t.Setenv("ADMIN_BOOTSTRAP_EMAIL", testutil.UniqueEmail(t, "bootstrap_admin_unknown"))

	err := services.BootstrapAdmin(context.Background(), database.Queries)
	require.NoError(t, err)
}

func TestBootstrapAdmin_UnsetEnvIsNoOp(t *testing.T) {
	testutil.SetupTestDB(t)

	t.Setenv("ADMIN_BOOTSTRAP_EMAIL", "")

	err := services.BootstrapAdmin(context.Background(), database.Queries)
	require.NoError(t, err)
}

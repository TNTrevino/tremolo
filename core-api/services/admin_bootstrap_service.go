package services

import (
	"context"
	"database/sql"
	"errors"
	"os"

	dtos "sight-reading/DTOs"
	"sight-reading/database/generated"
	"sight-reading/logger"
)

// BootstrapAdmin promotes the user identified by the ADMIN_BOOTSTRAP_EMAIL
// environment variable to the ADMIN role, if the variable is set.
//
// This exists so a fresh self-hosted deploy has a typo-proof, logged way
// to mint its first admin, instead of an operator hand-writing
// `UPDATE ... SET role_id = ...` against the production database. The
// manual SQL route still works and stays documented as the break-glass
// fallback for when the service itself won't start; this is the path for
// every deploy that does.
//
// The operator flow: register an account normally through the app, set
// ADMIN_BOOTSTRAP_EMAIL in /etc/tremolo/.env, and restart core-api. main.go
// calls this once at startup, after migrations have run and before the
// server starts accepting requests, so the promotion (or the warning below)
// shows up in the very first lines of the new process's logs.
//
// It is idempotent by construction, which is what makes it safe to leave
// the variable set indefinitely -- the operator does not have to remember
// to remove it after the first successful run, and setting it before the
// target account has even registered is also harmless:
//
//   - No user has that email yet: log a warning and return nil. The
//     operator registers, then restarts (or the variable just sits there
//     until they do).
//   - The user exists and is already ADMIN: log at debug and return nil.
//   - The user exists and is not ADMIN: promote them and log loudly (Warn)
//     -- granting ADMIN is rare and security-relevant enough that an
//     operator should never have to go looking for it in the logs.
func BootstrapAdmin(ctx context.Context, q generated.Querier) error {
	raw := os.Getenv("ADMIN_BOOTSTRAP_EMAIL")
	if raw == "" {
		return nil
	}

	email := normalizeEmail(raw)
	emailArg := sql.NullString{String: email, Valid: true}

	_, promoteErr := q.PromoteUserToAdmin(ctx, emailArg)
	if promoteErr == nil {
		logger.Warn("ADMIN_BOOTSTRAP_EMAIL: promoted user to ADMIN", "email", email)
		return nil
	}
	if !errors.Is(promoteErr, sql.ErrNoRows) {
		return promoteErr
	}

	// The update matched no row, which is ambiguous by construction: its
	// WHERE clause excludes a user who is already ADMIN, so "no rows" also
	// covers "no such user". This lookup is the only reason that matters,
	// since the two cases log differently.
	role, roleErr := q.GetUserRoleNameByEmail(ctx, emailArg)
	if errors.Is(roleErr, sql.ErrNoRows) {
		logger.Warn("ADMIN_BOOTSTRAP_EMAIL is set but no user has that email yet; register the account normally, then restart core-api (safe to leave the variable set in the meantime)", "email", email)
		return nil
	}
	if roleErr != nil {
		return roleErr
	}

	if role != string(dtos.Admin) {
		// Should not happen: PromoteUserToAdmin's WHERE clause only
		// excludes rows already at ADMIN, so any other role would have
		// been promoted above instead of landing here. Flag it rather
		// than assume, but this is still not a service failure.
		logger.Warn("ADMIN_BOOTSTRAP_EMAIL user was found but neither promoted nor already ADMIN; investigate", "email", email, "role", role)
		return nil
	}

	logger.Debug("ADMIN_BOOTSTRAP_EMAIL user is already ADMIN; nothing to do", "email", email)
	return nil
}

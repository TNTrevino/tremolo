package database

import (
	"database/sql"
	"embed"
	"log"

	"github.com/pressly/goose/v3"
)

//go:embed migrations/*.sql
var embedMigrations embed.FS

func RunMigrations(db *sql.DB) {
	goose.SetBaseFS(embedMigrations)

	if err := goose.SetDialect("postgres"); err != nil {
		log.Fatalf("failed to set goose dialect: %v", err)
	}

	// WithAllowMissing: this repo numbers migrations across parallel PR
	// stacks (12-14 and 17 on the email stack, 15 on the grade PR), so a
	// database can legitimately meet a version below its current max --
	// merge order decides. Strict goose refuses to boot on that; allowing
	// out-of-order applies is the policy that matches the numbering.
	if err := goose.Up(db, "migrations", goose.WithAllowMissing()); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}
}

// Package database contains the configuration to the database connection
package database

import (
	"database/sql"
	"log"
	"os"
	"strings"

	"sight-reading/database/generated"

	_ "github.com/lib/pq"
)

// Querier is the set of database operations sqlc generates, re-exported
// here so a controller can accept one as a parameter without importing
// database/generated. Controllers are not allowed to reach into the
// generated package; they hand a Querier to a service and nothing more.
type Querier = generated.Querier

var (
	// DBConn is the standard sql.DB connection
	DBConn *sql.DB
	// Queries provides type-safe database operations via sqlc
	Queries *generated.Queries
)

func InitializeDBConnection() {
	DBConnectionString := os.Getenv("DATABASE_URL")

	conn, err := sql.Open("postgres", DBConnectionString)
	if err != nil {
		panic(err.Error())
	}

	err = conn.Ping()
	if err != nil {
		panic(err.Error())
	}

	DBConn = conn

	// DBConn stays the raw handle: goose runs its migrations through it,
	// and those are not sqlc queries.
	Queries = newLoggedQueries(conn)

	log.Println(strings.Repeat("------------------------------", 2))
	log.Println("Connected to database successfully")
	log.Println(strings.Repeat("------------------------------", 2))
}

// WithTx returns a Queries bound to tx, with the query log still in place.
//
// Use this instead of generated.Queries.WithTx. That method takes a raw
// *sql.Tx and builds a fresh Queries from it, without reading the db field
// of the receiver, so the wrapper never reaches the new value:
//
//	func (q *Queries) WithTx(tx *sql.Tx) *Queries {
//		return &Queries{db: tx}
//	}
//
// Every statement run through such a Queries goes straight to the driver.
// It logs no name, no duration and no error, while queries outside the
// transaction keep logging as usual. That leaves a log that reads as
// complete and is silently missing whatever someone thought important
// enough to wrap in a transaction.
//
// *sql.Tx satisfies generated.DBTX on its own, so the wrapper takes it the
// same way it takes the connection.
func WithTx(tx *sql.Tx) *generated.Queries {
	return newLoggedQueries(tx)
}

// newLoggedQueries builds the sqlc Queries over the query log.
//
// It is the one place that hands generated.New its DBTX. Both the shared
// Queries and WithTx go through it, so neither can end up unwrapped.
func newLoggedQueries(db generated.DBTX) *generated.Queries {
	return generated.New(newQueryLogger(db))
}

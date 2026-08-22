// Package database contains the configuration to the database connection
package database

import (
	"database/sql"
	"log"
	"os"
	"sight-reading/database/generated"
	"strings"

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
	Queries = generated.New(conn)

	log.Println(strings.Repeat("------------------------------", 2))
	log.Println("Connected to database successfully")
	log.Println(strings.Repeat("------------------------------", 2))
}

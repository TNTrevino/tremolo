// Package database contains the configuration to the database connection
package database

import (
	"database/sql"
	"os"
	"sight-reading/database/generated"
	"strings"

	_ "github.com/lib/pq"
)

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

	println(strings.Repeat("------------------------------", 2))
	println("\nConnected to database successfully\n")
	println(strings.Repeat("------------------------------", 2))
}

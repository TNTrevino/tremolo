// Package database contains the configuratino to the database connection
package database

import (
	"os"
	"strings"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

var DBClient *sqlx.DB

func InitializeDBConnection() {
	DBConnectionString := os.Getenv("DATABASE_URL")

	db, err := sqlx.Open("postgres", DBConnectionString)
	if err != nil {
		panic(err.Error())
	} else {
		println(strings.Repeat("------------------------------", 2))
		println("\nConnected to database successfully\n")
		println(strings.Repeat("------------------------------", 2))
	}

	err = db.Ping()
	if err != nil {
		panic(err.Error())
	}

	DBClient = db
}

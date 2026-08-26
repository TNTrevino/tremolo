package database

import (
	"context"
	"database/sql"
	"log/slog"
	"os"
	"strconv"
	"strings"
	"time"

	"sight-reading/database/generated"
	"sight-reading/logger"
)

// Query naming. sqlc keeps its own `-- name: Foo :many` header as the
// first line of every generated SQL const, so the wrapper reads the name
// straight off the query text and needs no lookup table.
const (
	// sqlcNamePrefix is the header sqlc writes above each query.
	sqlcNamePrefix = "-- name:"

	// maxQueryNameLen bounds the fallback for SQL that has no header,
	// which is hand-written SQL such as goose's own migration statements.
	maxQueryNameLen = 40

	// unknownQueryName names a query with no usable text at all.
	unknownQueryName = "unknown"
)

// queryLogger wraps the database handle sqlc talks to and logs one line
// per statement.
//
// sqlc offers no hook of its own. It generates code against the DBTX
// interface it declares, and generated.New accepts anything that satisfies
// it. So the seam is the interface, not the generated code: this type
// implements DBTX, logs, and calls the real handle. Nothing above it in
// the service knows it is there.
//
// It follows the shape of middleware.RequestLog on purpose. Both wrap a
// call, time it, and write one structured line.
type queryLogger struct {
	db  generated.DBTX
	log *slog.Logger
	// logArgs turns on the argument list. It is off by default because
	// query arguments carry email addresses, reset tokens and password
	// hashes, and a debug log is not a place for those to sit.
	logArgs bool
}

// Compile-time proof that the wrapper can stand in for the real handle.
var _ generated.DBTX = (*queryLogger)(nil)

// newQueryLogger wraps db with the service's configured logger.
func newQueryLogger(db generated.DBTX) *queryLogger {
	// ParseBool's error is dropped on purpose: an unset or misspelled
	// value leaves arguments off, which is the safe direction.
	logArgs, _ := strconv.ParseBool(os.Getenv("LOG_SQL_ARGS"))

	return &queryLogger{
		db:      db,
		log:     logger.Default(),
		logArgs: logArgs,
	}
}

// ExecContext runs a statement and reports how many rows it changed.
func (q *queryLogger) ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error) {
	started := time.Now()
	result, err := q.db.ExecContext(ctx, query, args...)
	if err != nil {
		q.record(started, query, args, err)
		return result, err
	}

	// A driver may decline to count. The statement still succeeded, so
	// the line is still worth writing without the count.
	if rows, countErr := result.RowsAffected(); countErr == nil {
		q.record(started, query, args, nil, "rows", rows)
	} else {
		q.record(started, query, args, nil)
	}

	return result, nil
}

// QueryContext runs a query that returns rows.
//
// It deliberately reports no row count. sql.Rows is a cursor, and counting
// it here would consume the rows before sqlc ever scanned them.
func (q *queryLogger) QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error) {
	started := time.Now()
	rows, err := q.db.QueryContext(ctx, query, args...)
	q.record(started, query, args, err)

	return rows, err
}

// QueryRowContext runs a query that returns at most one row.
//
// It reports no error either. sql.Row holds its error until Scan, which
// the caller runs after this method has already returned.
func (q *queryLogger) QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row {
	started := time.Now()
	row := q.db.QueryRowContext(ctx, query, args...)
	q.record(started, query, args, nil)

	return row
}

// PrepareContext prepares a statement.
//
// sqlc only calls this when emit_prepared_queries is on, which sqlc.yaml
// does not set. It is wrapped anyway so the wrapper stays a complete DBTX
// rather than one that quietly stops logging if that setting ever changes.
func (q *queryLogger) PrepareContext(ctx context.Context, query string) (*sql.Stmt, error) {
	started := time.Now()
	stmt, err := q.db.PrepareContext(ctx, query)
	q.record(started, query, nil, err)

	return stmt, err
}

// record writes the one log line for a statement.
//
// A failed statement logs at error because it is the thing an operator
// needs to see. A successful one logs at debug, so the default level of
// info leaves a deployed service exactly as quiet as it is today.
func (q *queryLogger) record(started time.Time, query string, args []any, err error, extra ...any) {
	fields := make([]any, 0, 8+len(extra))
	fields = append(fields, "name", queryName(query))
	fields = append(fields, extra...)
	fields = append(fields, "took", time.Since(started).Round(time.Microsecond).String())

	if q.logArgs && len(args) > 0 {
		fields = append(fields, "args", args)
	}

	if err != nil {
		fields = append(fields, "err", err.Error())
		q.log.Error("query", fields...)
		return
	}

	q.log.Debug("query", fields...)
}

// queryName is the short label for a statement.
//
// It returns the sqlc query name when the header is there, and the first
// line of the SQL when it is not.
func queryName(query string) string {
	first, _, _ := strings.Cut(strings.TrimSpace(query), "\n")
	first = strings.TrimSpace(first)

	if first == "" {
		return unknownQueryName
	}

	if header, found := strings.CutPrefix(first, sqlcNamePrefix); found {
		// The header is "-- name: Foo :many". The name is the first word
		// after the prefix; the ":many" annotation is not part of it.
		name, _, _ := strings.Cut(strings.TrimSpace(header), " ")
		if name != "" {
			return name
		}
	}

	if len(first) > maxQueryNameLen {
		return first[:maxQueryNameLen]
	}

	return first
}

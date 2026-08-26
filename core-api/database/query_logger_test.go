package database

import (
	"bytes"
	"context"
	"database/sql"
	"errors"
	"log/slog"
	"strings"
	"testing"

	"sight-reading/database/generated"
)

// claimSQL is the shape sqlc actually generates. The `-- name:` header
// survives into the const, which is where the query name comes from.
const claimSQL = `-- name: ClaimQueuedEmails :many
with claimable as (
    select id
    from tremolo.queued_emails
)
`

// fakeResult is a sql.Result whose RowsAffected the test controls.
type fakeResult struct {
	rows int64
	err  error
}

func (r fakeResult) LastInsertId() (int64, error) { return 0, nil }
func (r fakeResult) RowsAffected() (int64, error) { return r.rows, r.err }

// fakeDBTX records what it was handed and returns what the test tells it
// to. It stands in for *sql.DB, which is the only thing the wrapper wraps.
type fakeDBTX struct {
	execResult sql.Result
	execErr    error
	queryErr   error
	prepareErr error

	gotQuery string
	gotArgs  []any
	calls    int
}

func (f *fakeDBTX) ExecContext(_ context.Context, query string, args ...any) (sql.Result, error) {
	f.calls++
	f.gotQuery, f.gotArgs = query, args
	return f.execResult, f.execErr
}

func (f *fakeDBTX) QueryContext(_ context.Context, query string, args ...any) (*sql.Rows, error) {
	f.calls++
	f.gotQuery, f.gotArgs = query, args
	return nil, f.queryErr
}

func (f *fakeDBTX) QueryRowContext(_ context.Context, query string, args ...any) *sql.Row {
	f.calls++
	f.gotQuery, f.gotArgs = query, args
	return nil
}

func (f *fakeDBTX) PrepareContext(_ context.Context, query string) (*sql.Stmt, error) {
	f.calls++
	f.gotQuery = query
	return nil, f.prepareErr
}

var _ generated.DBTX = (*fakeDBTX)(nil)

// newTestQueryLogger builds a wrapper whose output the test can read.
func newTestQueryLogger(db generated.DBTX, out *bytes.Buffer, logArgs bool) *queryLogger {
	return &queryLogger{
		db:      db,
		log:     slog.New(slog.NewTextHandler(out, &slog.HandlerOptions{Level: slog.LevelDebug})),
		logArgs: logArgs,
	}
}

func TestQueryNameReadsTheSqlcHeader(t *testing.T) {
	tests := []struct {
		name  string
		query string
		want  string
	}{
		{
			name:  "the sqlc header gives the query name",
			query: claimSQL,
			want:  "ClaimQueuedEmails",
		},
		{
			name:  "a header with no annotation still gives the name",
			query: "-- name: MarkEmailSent\nupdate tremolo.queued_emails set status = 'sent'",
			want:  "MarkEmailSent",
		},
		{
			name:  "a query with no header falls back to its first line",
			query: "select 1",
			want:  "select 1",
		},
		{
			name:  "a long first line is truncated",
			query: strings.Repeat("x", 80),
			want:  strings.Repeat("x", maxQueryNameLen),
		},
		{
			name:  "an empty query is named unknown",
			query: "   \n  ",
			want:  unknownQueryName,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := queryName(tc.query); got != tc.want {
				t.Errorf("queryName() = %q, want %q", got, tc.want)
			}
		})
	}
}

func TestExecContextLogsTheNameAndRowsAffected(t *testing.T) {
	var out bytes.Buffer
	db := &fakeDBTX{execResult: fakeResult{rows: 3}}
	q := newTestQueryLogger(db, &out, false)

	if _, err := q.ExecContext(context.Background(), claimSQL, 300, 10); err != nil {
		t.Fatalf("ExecContext() error = %v", err)
	}

	logged := out.String()
	if !strings.Contains(logged, "level=DEBUG") {
		t.Errorf("a successful query should log at debug, got %q", logged)
	}
	for _, want := range []string{"name=ClaimQueuedEmails", "rows=3", "took="} {
		if !strings.Contains(logged, want) {
			t.Errorf("log line %q is missing %q", logged, want)
		}
	}
}

func TestExecContextLogsAFailureAtErrorLevel(t *testing.T) {
	var out bytes.Buffer
	wantErr := errors.New("duplicate key value violates unique constraint")
	db := &fakeDBTX{execErr: wantErr}
	q := newTestQueryLogger(db, &out, false)

	_, err := q.ExecContext(context.Background(), claimSQL)

	if !errors.Is(err, wantErr) {
		t.Fatalf("ExecContext() error = %v, want %v", err, wantErr)
	}

	logged := out.String()
	if !strings.Contains(logged, "level=ERROR") {
		t.Errorf("a failed query should log at error, got %q", logged)
	}
	if !strings.Contains(logged, "duplicate key") {
		t.Errorf("log line %q is missing the driver error", logged)
	}
}

// TestQueryContextLogsNoRowCount guards the one thing the wrapper must not
// do. Counting rows would consume the cursor before sqlc reads it.
func TestQueryContextLogsNoRowCount(t *testing.T) {
	var out bytes.Buffer
	db := &fakeDBTX{}
	q := newTestQueryLogger(db, &out, false)

	if _, err := q.QueryContext(context.Background(), claimSQL, 300); err != nil {
		t.Fatalf("QueryContext() error = %v", err)
	}

	logged := out.String()
	if strings.Contains(logged, "rows=") {
		t.Errorf("QueryContext must not report a row count, got %q", logged)
	}
	if !strings.Contains(logged, "name=ClaimQueuedEmails") {
		t.Errorf("log line %q is missing the query name", logged)
	}
}

func TestQueryRowContextCallsThroughAndLogs(t *testing.T) {
	var out bytes.Buffer
	db := &fakeDBTX{}
	q := newTestQueryLogger(db, &out, false)

	q.QueryRowContext(context.Background(), claimSQL, 7)

	if db.calls != 1 {
		t.Fatalf("underlying QueryRowContext called %d times, want 1", db.calls)
	}
	if !strings.Contains(out.String(), "name=ClaimQueuedEmails") {
		t.Errorf("log line %q is missing the query name", out.String())
	}
}

func TestPrepareContextCallsThrough(t *testing.T) {
	var out bytes.Buffer
	wantErr := errors.New("prepare failed")
	db := &fakeDBTX{prepareErr: wantErr}
	q := newTestQueryLogger(db, &out, false)

	_, err := q.PrepareContext(context.Background(), claimSQL)

	if !errors.Is(err, wantErr) {
		t.Fatalf("PrepareContext() error = %v, want %v", err, wantErr)
	}
	if db.gotQuery != claimSQL {
		t.Errorf("the wrapper changed the query text")
	}
}

// TestArgumentsAreOmittedByDefault is the privacy guard. Query arguments
// carry email addresses, reset tokens and password hashes.
func TestArgumentsAreOmittedByDefault(t *testing.T) {
	var out bytes.Buffer
	db := &fakeDBTX{execResult: fakeResult{rows: 1}}
	q := newTestQueryLogger(db, &out, false)

	if _, err := q.ExecContext(context.Background(), claimSQL, "noe@example.com"); err != nil {
		t.Fatalf("ExecContext() error = %v", err)
	}

	logged := out.String()
	if strings.Contains(logged, "noe@example.com") {
		t.Errorf("arguments must not be logged by default, got %q", logged)
	}
	if strings.Contains(logged, "args=") {
		t.Errorf("there should be no args key by default, got %q", logged)
	}
}

func TestArgumentsAreLoggedWhenEnabled(t *testing.T) {
	var out bytes.Buffer
	db := &fakeDBTX{execResult: fakeResult{rows: 1}}
	q := newTestQueryLogger(db, &out, true)

	if _, err := q.ExecContext(context.Background(), claimSQL, "noe@example.com"); err != nil {
		t.Fatalf("ExecContext() error = %v", err)
	}

	if !strings.Contains(out.String(), "noe@example.com") {
		t.Errorf("log line %q is missing the arguments", out.String())
	}
}

func TestSqlTextIsOmittedByDefault(t *testing.T) {
	var out bytes.Buffer
	db := &fakeDBTX{}
	q := newTestQueryLogger(db, &out, false)

	if _, err := q.QueryContext(context.Background(), claimSQL); err != nil {
		t.Fatalf("QueryContext() error = %v", err)
	}

	logged := out.String()
	if strings.Contains(logged, "sql=") {
		t.Errorf("there should be no sql key by default, got %q", logged)
	}
	if strings.Contains(logged, "with claimable") {
		t.Errorf("the query body must not be logged by default, got %q", logged)
	}
}

func TestSqlTextIsLoggedWhenEnabled(t *testing.T) {
	var out bytes.Buffer
	db := &fakeDBTX{}
	q := newTestQueryLogger(db, &out, false)
	q.logSQL = true

	if _, err := q.QueryContext(context.Background(), claimSQL); err != nil {
		t.Fatalf("QueryContext() error = %v", err)
	}

	logged := out.String()
	for _, want := range []string{"with claimable", "tremolo.queued_emails"} {
		if !strings.Contains(logged, want) {
			t.Errorf("log line %q is missing %q", logged, want)
		}
	}
}

// TestSqlTextDropsTheSqlcHeader keeps the line from saying the same thing
// twice. The name key already carries what the header says.
func TestSqlTextDropsTheSqlcHeader(t *testing.T) {
	var out bytes.Buffer
	db := &fakeDBTX{}
	q := newTestQueryLogger(db, &out, false)
	q.logSQL = true

	if _, err := q.QueryContext(context.Background(), claimSQL); err != nil {
		t.Fatalf("QueryContext() error = %v", err)
	}

	logged := out.String()
	if strings.Contains(logged, sqlcNamePrefix) {
		t.Errorf("the sqlc header should be stripped from the body, got %q", logged)
	}
	if !strings.Contains(logged, "name=ClaimQueuedEmails") {
		t.Errorf("the query name should survive as its own key, got %q", logged)
	}
}

func TestQueryBodyKeepsHandWrittenSqlWhole(t *testing.T) {
	const plain = "select 1\nfrom users"

	if got := queryBody(plain); got != plain {
		t.Errorf("queryBody() = %q, want %q", got, plain)
	}
}

func TestNewQueryLoggerReadsLogSqlText(t *testing.T) {
	tests := []struct {
		value string
		want  bool
	}{
		{value: "true", want: true},
		{value: "1", want: true},
		{value: "false", want: false},
		{value: "", want: false},
		{value: "nonsense", want: false},
	}

	for _, tc := range tests {
		t.Run("LOG_SQL_TEXT="+tc.value, func(t *testing.T) {
			t.Setenv("LOG_SQL_TEXT", tc.value)

			if got := newQueryLogger(&fakeDBTX{}).logSQL; got != tc.want {
				t.Errorf("logSQL = %v, want %v", got, tc.want)
			}
		})
	}
}

// TestNewQueryLoggerReadsLogSqlArgs covers the opt-in. Anything that is
// not a recognised truth value must leave arguments off, so that a typo
// fails closed rather than starting to log tokens.
func TestNewQueryLoggerReadsLogSqlArgs(t *testing.T) {
	tests := []struct {
		value string
		want  bool
	}{
		{value: "true", want: true},
		{value: "1", want: true},
		{value: "false", want: false},
		{value: "", want: false},
		{value: "nonsense", want: false},
	}

	for _, tc := range tests {
		t.Run("LOG_SQL_ARGS="+tc.value, func(t *testing.T) {
			t.Setenv("LOG_SQL_ARGS", tc.value)

			if got := newQueryLogger(&fakeDBTX{}).logArgs; got != tc.want {
				t.Errorf("logArgs = %v, want %v", got, tc.want)
			}
		})
	}
}

// TestExecContextSurvivesADriverThatCannotCountRows covers a Result whose
// RowsAffected errors. The query still succeeded, so it must still log.
func TestExecContextSurvivesADriverThatCannotCountRows(t *testing.T) {
	var out bytes.Buffer
	db := &fakeDBTX{execResult: fakeResult{err: errors.New("unsupported")}}
	q := newTestQueryLogger(db, &out, false)

	if _, err := q.ExecContext(context.Background(), claimSQL); err != nil {
		t.Fatalf("ExecContext() error = %v", err)
	}

	logged := out.String()
	if !strings.Contains(logged, "name=ClaimQueuedEmails") {
		t.Errorf("log line %q is missing the query name", logged)
	}
	if strings.Contains(logged, "rows=") {
		t.Errorf("an uncountable result must not report rows, got %q", logged)
	}
}

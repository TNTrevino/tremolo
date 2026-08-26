package logger

import (
	"context"
	"log/slog"
	"testing"

	charm "charm.land/log/v2"
)

// TestInitLoggerPicksTheHandlerFromLogFormat locks the three-way choice
// down. Deployed machines set LOG_FORMAT=json and must keep the JSON
// handler; a laptop sets nothing and must get the charm handler.
func TestInitLoggerPicksTheHandlerFromLogFormat(t *testing.T) {
	tests := []struct {
		name   string
		format string
		want   func(slog.Handler) bool
	}{
		{
			name:   "json gives the JSON handler",
			format: "json",
			want:   func(h slog.Handler) bool { _, ok := h.(*slog.JSONHandler); return ok },
		},
		{
			name:   "the format is case insensitive",
			format: "JSON",
			want:   func(h slog.Handler) bool { _, ok := h.(*slog.JSONHandler); return ok },
		},
		{
			name:   "text gives the slog text handler",
			format: "text",
			want:   func(h slog.Handler) bool { _, ok := h.(*slog.TextHandler); return ok },
		},
		{
			name:   "an unset format gives the charm handler",
			format: "",
			want:   func(h slog.Handler) bool { _, ok := h.(*charm.Logger); return ok },
		},
		{
			name:   "an unknown format gives the charm handler",
			format: "banana",
			want:   func(h slog.Handler) bool { _, ok := h.(*charm.Logger); return ok },
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Setenv("LOG_FORMAT", tc.format)
			t.Setenv("LOG_LEVEL", "INFO")

			InitLogger()

			if !tc.want(Default().Handler()) {
				t.Fatalf("LOG_FORMAT=%q produced handler %T", tc.format, Default().Handler())
			}
		})
	}
}

// TestCharmHandlerHonoursLogLevel proves the slog level reaches the charm
// handler. Charm filters on its own Level field, so a missing conversion
// would silently leave every logger at charm's own default of info.
func TestCharmHandlerHonoursLogLevel(t *testing.T) {
	tests := []struct {
		name      string
		level     string
		wantDebug bool
		wantError bool
	}{
		{name: "debug enables debug", level: "DEBUG", wantDebug: true, wantError: true},
		{name: "info hides debug", level: "INFO", wantDebug: false, wantError: true},
		{name: "error hides everything below it", level: "ERROR", wantDebug: false, wantError: true},
		{name: "warn hides debug", level: "WARN", wantDebug: false, wantError: true},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Setenv("LOG_FORMAT", "")
			t.Setenv("LOG_LEVEL", tc.level)

			InitLogger()
			handler := Default().Handler()

			if got := handler.Enabled(context.Background(), slog.LevelDebug); got != tc.wantDebug {
				t.Errorf("debug enabled = %v, want %v", got, tc.wantDebug)
			}
			if got := handler.Enabled(context.Background(), slog.LevelError); got != tc.wantError {
				t.Errorf("error enabled = %v, want %v", got, tc.wantError)
			}
		})
	}
}

// TestDefaultFallsBackWhenInitLoggerNeverRan covers a package that reaches
// for the logger before main has wired it, which is what every test binary
// in this repo does.
func TestDefaultFallsBackWhenInitLoggerNeverRan(t *testing.T) {
	saved := defaultLogger
	t.Cleanup(func() { defaultLogger = saved })

	defaultLogger = nil

	if Default() == nil {
		t.Fatal("Default() returned nil with no logger configured")
	}
}

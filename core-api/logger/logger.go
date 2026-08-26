// Package logger container the configuration for the global logger.
// Uses environment variable to set the log level, and format.
package logger

import (
	"log/slog"
	"os"
	"strings"

	charm "charm.land/log/v2"
)

// philosophy stuff when it comes to logging:
// https://betterstack.com/community/guides/logging/logging-in-go/

// devTimeFormat drops the date from a development log line. A laptop
// already knows what day it is, and the full RFC 3339 stamp is the single
// widest column in the output.
const devTimeFormat = "15:04:05"

var defaultLogger *slog.Logger

func InitLogger() {
	level := parseLogLevel(os.Getenv("LOG_LEVEL"))

	opts := &slog.HandlerOptions{
		Level: level,
	}

	var handler slog.Handler

	switch strings.ToLower(os.Getenv("LOG_FORMAT")) {
	case "json":
		// What deployed machines set. A log shipper parses this.
		handler = slog.NewJSONHandler(os.Stdout, opts)
	case "text":
		handler = slog.NewTextHandler(os.Stdout, opts)
	default:
		// great for devs!
		handler = charm.NewWithOptions(os.Stdout, charm.Options{
			Level:           charmLevel(level),
			ReportTimestamp: true,
			TimeFormat:      devTimeFormat,
		})
	}

	defaultLogger = slog.New(handler)
}

// Default is the configured logger.
//
// It falls back to slog's own default when InitLogger has not run, which
// is the case in every test binary: a package that reaches for the logger
// during a test must not panic on a nil pointer.
func Default() *slog.Logger {
	if defaultLogger == nil {
		return slog.Default()
	}
	return defaultLogger
}

// parse log level from a string
func parseLogLevel(level string) slog.Level {
	switch strings.ToUpper(level) {
	case "DEBUG":
		return slog.LevelDebug
	case "INFO":
		return slog.LevelInfo
	case "WARN", "WARNING":
		return slog.LevelWarn
	case "ERROR":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

// charmLevel converts an slog level to charm's own.
//
// charm filters in its Enabled method against the Level it was built with,
// not against slog.HandlerOptions, so skipping this conversion would leave
// every log line at charm's default of info however LOG_LEVEL was set.
//
// The two types hold the same numbers by design. charm.DebugLevel is -4
// and slog.LevelDebug is -4, and so on up. The conversion is a cast, and
// the switch exists only so an upstream change to either set of constants
// breaks here instead of silently mapping to the wrong level.
func charmLevel(level slog.Level) charm.Level {
	switch level {
	case slog.LevelDebug:
		return charm.DebugLevel
	case slog.LevelInfo:
		return charm.InfoLevel
	case slog.LevelWarn:
		return charm.WarnLevel
	case slog.LevelError:
		return charm.ErrorLevel
	default:
		return charm.Level(level)
	}
}

func Info(msg string, args ...any) {
	defaultLogger.Info(msg, args...)
}

func Error(msg string, args ...any) {
	defaultLogger.Error(msg, args...)
}

func Warn(msg string, args ...any) {
	defaultLogger.Warn(msg, args...)
}

func Debug(msg string, args ...any) {
	defaultLogger.Debug(msg, args...)
}

func With(args ...any) *slog.Logger {
	return defaultLogger.With(args...)
}

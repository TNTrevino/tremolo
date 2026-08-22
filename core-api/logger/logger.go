// Package logger container the configuration for the global logger.
// Uses environment variable to set the log level, and format.
package logger

import (
	"log/slog"
	"os"
	"strings"
)

// philosophy stuff when it comes to logging:
// https://betterstack.com/community/guides/logging/logging-in-go/

var defaultLogger *slog.Logger

func InitLogger() {
	level := parseLogLevel(os.Getenv("LOG_LEVEL"))

	opts := &slog.HandlerOptions{
		Level: level,
	}

	var handler slog.Handler
	logFormat := strings.ToLower(os.Getenv("LOG_FORMAT"))

	// prod?
	if logFormat == "json" {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		// I just personally prefer this
		handler = slog.NewTextHandler(os.Stdout, opts)
	}

	defaultLogger = slog.New(handler)
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

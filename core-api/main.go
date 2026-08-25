package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"sight-reading/controllers"
	"sight-reading/database"
	"sight-reading/generation"
	"sight-reading/logger"
	"sight-reading/middleware"
)

// Server timeouts. net/http sets none by default, which means a single
// slow or stalled client can hold a connection, and enough of them can
// hold the service. These constants close that gap.
const (
	// readHeaderTimeout bounds the slowloris window: how long a client
	// may take to send its request headers.
	readHeaderTimeout = 10 * time.Second

	// readTimeout bounds headers plus body.
	readTimeout = 30 * time.Second

	// writeTimeout bounds the handler and its response. It is the
	// ceiling on how long any request may take, so it sits above the
	// slowest chart query rather than close to it.
	writeTimeout = 60 * time.Second

	// idleTimeout bounds a kept-alive connection between requests.
	idleTimeout = 120 * time.Second

	// shutdownTimeout is how long in-flight requests get to finish after
	// a stop signal before the process exits anyway.
	shutdownTimeout = 15 * time.Second
)

// @title                       Tremolo Core API
// @version                     1.0
// @description                 Core API for Tremolo (auth, users/teachers/friends, game settings, score entries, classes/assignments, dashboard charts).
// @BasePath                    /
// @securityDefinitions.apikey  BearerAuth
// @in                          header
// @name                        Authorization
// @description                 Type "Bearer" followed by a space and the JWT access token.
func main() {
	if err := run(context.Background(), os.Args[1:]); err != nil {
		fmt.Fprintf(os.Stderr, "core-api: %v\n", err)
		os.Exit(1)
	}
}

// run is everything main does, minus the process. It takes its context
// and arguments rather than reading globals, and it returns an error
// rather than calling os.Exit, so a test can start the service, talk to
// it, and stop it by cancelling ctx.
func run(ctx context.Context, args []string) error {
	// A stop signal cancels ctx, which starts the graceful shutdown
	// below. A second signal restores the default behaviour and kills
	// the process, so a stuck shutdown is still interruptible.
	ctx, stop := signal.NotifyContext(ctx, os.Interrupt, syscall.SIGTERM)
	defer stop()

	// init global deps
	logger.InitLogger()
	database.InitializeDBConnection()
	database.RunMigrations(database.DBConn)
	middleware.InitJWTSecret()
	controllers.InitGoogleOAuth()

	// faker flag
	flags := flag.NewFlagSet("core-api", flag.ContinueOnError)
	runPackage := flags.Bool("fake-it", false, "use this flag to generate data")
	if err := flags.Parse(args); err != nil {
		return err
	}
	if *runPackage {
		generation.GenerateData()
	}

	origins := allowedOrigins()

	port := os.Getenv("USER_SERVICE_PORT")
	if port == "" {
		port = "5001"
	}

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           NewServer(origins, database.Queries),
		ReadHeaderTimeout: readHeaderTimeout,
		ReadTimeout:       readTimeout,
		WriteTimeout:      writeTimeout,
		IdleTimeout:       idleTimeout,
	}

	serveErr := make(chan error, 1)
	go func() {
		logger.Info("core-api listening", "port", port)
		serveErr <- srv.ListenAndServe()
	}()

	select {
	case err := <-serveErr:
		// ErrServerClosed only appears after a Shutdown, which cannot
		// have happened here, so any error on this path is real.
		return err
	case <-ctx.Done():
	}

	logger.Info("shutting down", "grace_period", shutdownTimeout.String())

	// A fresh context: ctx is already cancelled, and Shutdown needs a
	// deadline of its own to wait out in-flight requests.
	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("graceful shutdown failed: %w", err)
	}

	if err := <-serveErr; err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}

	logger.Info("core-api stopped")
	return nil
}

// allowedOrigins reads the CORS allowlist from ALLOWED_ORIGINS, falling
// back to the local frontend when it is unset.
func allowedOrigins() []string {
	const localFrontend = "http://localhost:5173"

	raw := os.Getenv("ALLOWED_ORIGINS")
	if raw == "" {
		return []string{localFrontend}
	}

	// parse comma-separated origins and trim whitespace
	origins := make([]string, 0)
	for origin := range strings.SplitSeq(raw, ",") {
		if trimmed := strings.TrimSpace(origin); trimmed != "" {
			origins = append(origins, trimmed)
		}
	}

	if len(origins) == 0 {
		// Kept as a panic: an operator who set this variable to
		// punctuation meant to restrict origins, and starting with the
		// localhost default instead would silently ignore that.
		log.Panic("ALLOWED_ORIGINS environment variable is set but contains no valid origins")
	}

	return origins
}

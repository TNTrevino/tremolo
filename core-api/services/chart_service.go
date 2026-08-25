// Package services provides chart data fetching for performance metrics visualization
package services

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	dtos "sight-reading/DTOs"
	"sight-reading/database/generated"
	"sight-reading/logger"
)

const (
	// DefaultChartDataDays is the default number of days to fetch chart data for
	DefaultChartDataDays = "30"

	// MinChartDataDays is the minimum number of days that can be requested for chart data
	MinChartDataDays = 1
)

// GetUserChartData fetches personal metrics for a specific user. The
// controller has already authenticated the caller and parsed
// requestedUserID/interval/days from the request; this still re-checks
// that the caller may only see their own data (ErrForbidden) and that
// interval/days are valid (ErrValidation) so the rule holds for any
// caller, not just the HTTP handler.
func GetUserChartData(ctx context.Context, q generated.Querier, authenticatedUserID, requestedUserID int, interval string, days int) (dtos.MultiMetricChartData, error) {
	if authenticatedUserID != requestedUserID {
		logger.Info("User attempted to access another user's chart data",
			"authenticated_user", authenticatedUserID,
			"requested_user", requestedUserID)
		return dtos.MultiMetricChartData{}, ErrForbidden
	}

	strategy, err := resolveIntervalStrategy(interval, days)
	if err != nil {
		return dtos.MultiMetricChartData{}, err
	}

	rows, err := strategy.FetchUserData(ctx, q, int32(requestedUserID), days)
	if err != nil {
		logger.Error("Failed to fetch chart data", "error", err.Error(), "user_id", requestedUserID)
		return dtos.MultiMetricChartData{}, err
	}

	return convertRowsToChartData(rows), nil
}

// RequireTeacherRole verifies the authenticated user has exactly the
// TEACHER role. Unlike requireTeacher in class_service.go, ADMIN does not
// qualify here — this preserves the class-metrics endpoint's prior
// behavior of teachers only.
func RequireTeacherRole(ctx context.Context, q generated.Querier, teacherID int) error {
	role, err := q.GetUserRole(ctx, int32(teacherID))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		logger.Error("Failed to verify user role", "error", err.Error(), "user_id", teacherID)
		return err
	}

	if role != "TEACHER" {
		logger.Info("Non-teacher user attempted to access class metrics",
			"user_id", teacherID,
			"role", role)
		return ErrForbidden
	}

	return nil
}

// GetTeacherClassChartData fetches aggregated metrics for all students of
// a teacher. The roster is every student enrolled in an active class the
// teacher owns (class_students); a student in two of the teacher's
// classes still has each of their entries counted once. Callers must
// have already established the caller is a teacher (see
// RequireTeacherRole) — this only validates interval/days and
// fetches/transforms the data.
func GetTeacherClassChartData(ctx context.Context, q generated.Querier, teacherID int, interval string, days int) (dtos.MultiMetricChartData, error) {
	strategy, err := resolveIntervalStrategy(interval, days)
	if err != nil {
		return dtos.MultiMetricChartData{}, err
	}

	rows, err := strategy.FetchTeacherData(ctx, q, int32(teacherID), days)
	if err != nil {
		logger.Error("Failed to fetch teacher chart data", "error", err.Error(), "teacher_id", teacherID)
		return dtos.MultiMetricChartData{}, err
	}

	return convertRowsToChartData(rows), nil
}

// resolveIntervalStrategy validates interval/days and looks up the
// matching IntervalStrategy. Both endpoints share this validation.
func resolveIntervalStrategy(interval string, days int) (IntervalStrategy, error) {
	if err := dtos.ValidateInterval(interval); err != nil {
		return nil, validationErr(err)
	}
	if days < MinChartDataDays {
		return nil, validationErr(fmt.Errorf("invalid days parameter: must be at least %d", MinChartDataDays))
	}

	strategy, exists := GetIntervalStrategy(interval)
	if !exists {
		return nil, validationErr(fmt.Errorf("unsupported interval type: %s", interval))
	}
	return strategy, nil
}

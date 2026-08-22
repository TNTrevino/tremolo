package services

import (
	"context"
	"sight-reading/database/generated"
)

// IntervalStrategy defines the interface for fetching chart data based on interval type
// This allows for extensible interval handling without if-else branching
type IntervalStrategy interface {
	// FetchUserData fetches chart data for a specific user based on the interval strategy
	FetchUserData(ctx context.Context, q generated.Querier, userID int32, days int) ([]generated.FetchChartDataAllRow, error)

	// FetchTeacherData fetches chart data for a teacher's students based on the interval strategy
	FetchTeacherData(ctx context.Context, q generated.Querier, teacherID int32, days int) ([]generated.FetchChartDataAllRow, error)
}

// AllTimeStrategy fetches all data regardless of time range
type AllTimeStrategy struct{}

// FetchUserData implements IntervalStrategy for all-time user data
func (s *AllTimeStrategy) FetchUserData(ctx context.Context, q generated.Querier, userID int32, days int) ([]generated.FetchChartDataAllRow, error) {
	return q.FetchChartDataAll(ctx, userID)
}

// FetchTeacherData implements IntervalStrategy for all-time teacher data
func (s *AllTimeStrategy) FetchTeacherData(ctx context.Context, q generated.Querier, teacherID int32, days int) ([]generated.FetchChartDataAllRow, error) {
	teacherRows, err := q.FetchTeacherChartDataAll(ctx, teacherID)
	if err != nil {
		return nil, err
	}
	return convertFetchTeacherChartDataAllRowsToAllRows(teacherRows), nil
}

// RangeBasedStrategy fetches data within a specified time range
// This strategy is used for "day", "week", "month", and "year" intervals
type RangeBasedStrategy struct{}

// FetchUserData implements IntervalStrategy for range-based user data
func (s *RangeBasedStrategy) FetchUserData(ctx context.Context, q generated.Querier, userID int32, days int) ([]generated.FetchChartDataAllRow, error) {
	inRangeRows, err := q.FetchChartDataInRange(ctx, generated.FetchChartDataInRangeParams{
		UserID:   userID,
		DaysBack: int32(days),
	})
	if err != nil {
		return nil, err
	}
	return convertFetchChartDataInRangeRowsToAllRows(inRangeRows), nil
}

// FetchTeacherData implements IntervalStrategy for range-based teacher data
func (s *RangeBasedStrategy) FetchTeacherData(ctx context.Context, q generated.Querier, teacherID int32, days int) ([]generated.FetchChartDataAllRow, error) {
	teacherRows, err := q.FetchTeacherChartDataInRange(ctx, generated.FetchTeacherChartDataInRangeParams{
		TeacherID: teacherID,
		DaysBack:  int32(days),
	})
	if err != nil {
		return nil, err
	}
	return convertFetchTeacherChartDataInRangeRowsToAllRows(teacherRows), nil
}

// intervalStrategyRegistry maps interval names to their corresponding strategies
// This provides O(1) lookup and makes it easy to add new interval types
var intervalStrategyRegistry = map[string]IntervalStrategy{
	"all":   &AllTimeStrategy{},
	"day":   &RangeBasedStrategy{},
	"week":  &RangeBasedStrategy{},
	"month": &RangeBasedStrategy{},
	"year":  &RangeBasedStrategy{},
}

// GetIntervalStrategy returns the appropriate strategy for the given interval
// Returns the strategy and a boolean indicating if the interval is supported
func GetIntervalStrategy(interval string) (IntervalStrategy, bool) {
	strategy, exists := intervalStrategyRegistry[interval]
	return strategy, exists
}

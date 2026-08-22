package dtos

import (
	"sight-reading/validations"
	"time"
)

// ChartDataPoint represents a single point on the chart
// Used for Chart.js time-series visualization with x (timestamp) and y (value)
type ChartDataPoint struct {
	Timestamp time.Time `db:"timestamp" json:"x"`
	Value     float64   `db:"value" json:"y"`
}

// MultiMetricChartData contains all 4 metrics for the frontend Chart.js component
// Each metric is an array of data points for time-series visualization
type MultiMetricChartData struct {
	NPM            []ChartDataPoint `json:"npm"`
	Accuracy       []ChartDataPoint `json:"accuracy"`
	SessionCount   []ChartDataPoint `json:"sessionCount"`
	TotalQuestions []ChartDataPoint `json:"totalQuestions"`
}

// ValidateInterval checks if the interval parameter is valid
// Valid intervals: day, week, month, year (used with PostgreSQL date_trunc), all (no time constraint)
// Delegates to validations package for consistency
// Returns error if validation fails, nil otherwise
func ValidateInterval(interval string) error {
	return validations.ValidateChartInterval(interval)
}

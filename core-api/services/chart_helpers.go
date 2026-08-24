package services

import (
	"database/sql"
	"time"

	dtos "sight-reading/DTOs"
	"sight-reading/database/generated"
)

// convertRowsToChartData converts database rows to chart data with computed metrics
// Transforms raw database entries into Chart.js compatible time-series data points
func convertRowsToChartData(rows []generated.FetchChartDataAllRow) dtos.MultiMetricChartData {
	npm := make([]dtos.ChartDataPoint, 0, len(rows))
	accuracy := make([]dtos.ChartDataPoint, 0, len(rows))
	sessionCount := make([]dtos.ChartDataPoint, 0, len(rows))
	totalQuestions := make([]dtos.ChartDataPoint, 0, len(rows))

	for _, row := range rows {
		ts := combineDateTime(row.CreatedDate, row.CreatedTime)

		npm = append(npm, dtos.ChartDataPoint{
			Timestamp: ts,
			Value:     float64(row.NotesPerMinute),
		})

		var acc float64
		if row.TotalQuestions > 0 {
			acc = (float64(row.CorrectQuestions) / float64(row.TotalQuestions)) * 100
		}
		accuracy = append(accuracy, dtos.ChartDataPoint{
			Timestamp: ts,
			Value:     acc,
		})

		sessionCount = append(sessionCount, dtos.ChartDataPoint{
			Timestamp: ts,
			Value:     1,
		})

		totalQuestions = append(totalQuestions, dtos.ChartDataPoint{
			Timestamp: ts,
			Value:     float64(row.TotalQuestions),
		})
	}

	return dtos.MultiMetricChartData{
		NPM:            npm,
		Accuracy:       accuracy,
		SessionCount:   sessionCount,
		TotalQuestions: totalQuestions,
	}
}

// combineDateTime combines a date and time into a single timestamp
// Handles null values from database and returns zero time if date is invalid
func combineDateTime(date, t sql.NullTime) time.Time {
	if !date.Valid {
		return time.Time{}
	}

	d := date.Time
	if t.Valid {
		return time.Date(d.Year(), d.Month(), d.Day(),
			t.Time.Hour(), t.Time.Minute(), t.Time.Second(), t.Time.Nanosecond(),
			d.Location())
	}
	return d
}

// convertFetchChartDataInRangeRowsToAllRows converts FetchChartDataInRangeRow slice to FetchChartDataAllRow slice
// This allows us to use the same transformation logic for both range and all-time data
func convertFetchChartDataInRangeRowsToAllRows(inRangeRows []generated.FetchChartDataInRangeRow) []generated.FetchChartDataAllRow {
	rows := make([]generated.FetchChartDataAllRow, len(inRangeRows))
	for i, r := range inRangeRows {
		rows[i] = generated.FetchChartDataAllRow(r)
	}
	return rows
}

// convertFetchTeacherChartDataAllRowsToAllRows converts FetchTeacherChartDataAllRow slice to FetchChartDataAllRow slice
// This allows us to use the same transformation logic for both user and teacher data
func convertFetchTeacherChartDataAllRowsToAllRows(teacherRows []generated.FetchTeacherChartDataAllRow) []generated.FetchChartDataAllRow {
	rows := make([]generated.FetchChartDataAllRow, len(teacherRows))
	for i, r := range teacherRows {
		rows[i] = generated.FetchChartDataAllRow(r)
	}
	return rows
}

// convertFetchTeacherChartDataInRangeRowsToAllRows converts FetchTeacherChartDataInRangeRow slice to FetchChartDataAllRow slice
// This allows us to use the same transformation logic for both user and teacher range data
func convertFetchTeacherChartDataInRangeRowsToAllRows(teacherRows []generated.FetchTeacherChartDataInRangeRow) []generated.FetchChartDataAllRow {
	rows := make([]generated.FetchChartDataAllRow, len(teacherRows))
	for i, r := range teacherRows {
		rows[i] = generated.FetchChartDataAllRow(r)
	}
	return rows
}

package validations

import (
	"fmt"
	"net/http"
	"strconv"
)

// The helpers here read query parameters straight off *http.Request. They
// replace the gin.Context versions in request_validators.go, which go with
// the gin fallback. Names differ only because Go will not let one package
// hold two functions with the same name; these are the names that stay.

// QueryInt reads an integer query parameter, falling back to defaultValue
// when the caller omitted it. A value below minValue is an error rather
// than a silent clamp, so a caller asking for 0 days learns it was wrong.
func QueryInt(r *http.Request, name string, defaultValue, minValue int) (int, error) {
	raw := r.URL.Query().Get(name)
	if raw == "" {
		raw = strconv.Itoa(defaultValue)
	}

	value, err := strconv.Atoi(raw)
	if err != nil {
		return 0, fmt.Errorf("invalid %s parameter: must be a number", name)
	}
	if value < minValue {
		return 0, fmt.Errorf("invalid %s parameter: must be at least %d", name, minValue)
	}
	return value, nil
}

// ChartInterval reads the chart endpoints' interval parameter, which
// defaults to "day".
func ChartInterval(r *http.Request) (string, error) {
	interval := r.URL.Query().Get("interval")
	if interval == "" {
		interval = "day"
	}
	if err := ValidateChartInterval(interval); err != nil {
		return "", err
	}
	return interval, nil
}

// ChartDays reads the chart endpoints' days parameter, which defaults to
// 30 and must be at least 1.
func ChartDays(r *http.Request) (int, error) {
	return QueryInt(r, "days", 30, 1)
}

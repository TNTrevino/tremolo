package validations

import (
	"fmt"
	"strconv"

	"github.com/gin-gonic/gin"
)

// AuthenticatedUserID extracts and validates the authenticated user ID from Gin context
// Returns the user ID and an error if extraction or validation fails
// This is typically set by the JWT authentication middleware
func AuthenticatedUserID(c *gin.Context) (int, error) {
	userIDInterface, exists := c.Get("userID")
	if !exists {
		return 0, fmt.Errorf("user ID not found in context")
	}

	userID, ok := userIDInterface.(int)
	if !ok {
		return 0, fmt.Errorf("user ID has invalid type")
	}

	return userID, nil
}

// UserIDParam extracts and validates a user ID from URL path parameter
// Returns the user ID and an error if parsing fails or ID is invalid
func UserIDParam(c *gin.Context, paramName string) (int, error) {
	userIDStr := c.Param(paramName)
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		return 0, fmt.Errorf("invalid user ID parameter: must be a number")
	}
	if userID <= 0 {
		return 0, fmt.Errorf("invalid user ID parameter: must be positive")
	}
	return userID, nil
}

// ValidateUserAccess checks if the authenticated user has access to the requested user's data
// Returns an error if the authenticated user ID does not match the requested user ID
func ValidateUserAccess(authenticatedUserID, requestedUserID int) error {
	if authenticatedUserID != requestedUserID {
		return fmt.Errorf("access denied: cannot access another user's data")
	}
	return nil
}

// IntQueryParam extracts and validates an integer query parameter
// Returns the integer value, using defaultValue if the parameter is not provided
// Returns an error if parsing fails or the value doesn't meet min requirements
func IntQueryParam(c *gin.Context, paramName string, defaultValue, minValue int) (int, error) {
	valueStr := c.DefaultQuery(paramName, strconv.Itoa(defaultValue))
	value, err := strconv.Atoi(valueStr)
	if err != nil {
		return 0, fmt.Errorf("invalid %s parameter: must be a number", paramName)
	}
	if value < minValue {
		return 0, fmt.Errorf("invalid %s parameter: must be at least %d", paramName, minValue)
	}
	return value, nil
}

// ChartIntervalParam extracts and validates the interval query parameter for chart endpoints
// Returns the interval string (defaulting to "day") and an error if validation fails
func ChartIntervalParam(c *gin.Context) (string, error) {
	interval := c.DefaultQuery("interval", "day")
	if err := ValidateChartInterval(interval); err != nil {
		return "", err
	}
	return interval, nil
}

// ChartDaysParam extracts and validates the days query parameter for chart endpoints
// Returns the number of days (defaulting to 30) and an error if validation fails
func ChartDaysParam(c *gin.Context) (int, error) {
	return IntQueryParam(c, "days", 30, 1)
}

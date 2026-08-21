# Parameter Validation Refactoring Guide

## Overview

This refactoring extracts parameter validation logic from controller and service handlers into reusable validation functions. This follows the Single Responsibility Principle (SRP) by separating validation concerns from business logic.

## Problem Statement

Before refactoring, handlers mixed several concerns:
1. **Authentication validation** - Extracting user ID from context
2. **Parameter validation** - Parsing and validating URL/query parameters
3. **Authorization validation** - Checking user permissions
4. **Business logic** - Actual data fetching and processing

This made handlers:
- Difficult to test (couldn't test validation independently)
- Hard to maintain (validation logic duplicated across handlers)
- Violation of SRP (handlers doing too much)

## Solution

Extract validation into dedicated helper functions in the `validations` package:

### 1. Request Parameter Validators (`request_validators.go`)

These handle common parameter extraction and validation:

```go
// Extract authenticated user ID from context (set by JWT middleware)
authenticatedUserID, err := validations.AuthenticatedUserID(c)

// Extract and validate user ID from URL parameter
requestedUserID, err := validations.UserIDParam(c, "userId")

// Validate user can access requested resource
err := validations.ValidateUserAccess(authenticatedUserID, requestedUserID)

// Extract and validate integer query parameter with default and minimum
days, err := validations.IntQueryParam(c, "days", 30, 1)

// Extract and validate chart interval parameter
interval, err := validations.ChartIntervalParam(c)

// Extract and validate chart days parameter (convenience wrapper)
days, err := validations.ChartDaysParam(c)
```

### 2. Authorization Validators (`auth_validators.go`)

These handle role-based access control:

```go
// Validate user has teacher role
err := validations.ValidateTeacherRole(ctx, userID)

// Validate user has a specific role (more generic)
err := validations.ValidateUserRole(ctx, userID, validations.RoleTeacher)
```

## Migration Examples

### Before: chart_service.go (GetUserChartData)

```go
func GetUserChartData(c *gin.Context) {
    // Mixed validation and business logic
    userIDInterface, exists := c.Get("userID")
    if !exists {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
        return
    }

    authenticatedUserID, ok := userIDInterface.(int)
    if !ok {
        logger.Error("Failed to parse authenticated user ID from context")
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID"})
        return
    }

    requestedUserIDStr := c.Param("userId")
    requestedUserID, err := strconv.Atoi(requestedUserIDStr)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID parameter"})
        return
    }

    if authenticatedUserID != requestedUserID {
        logger.Info("User attempted to access another user's chart data", ...)
        c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
        return
    }

    interval := c.DefaultQuery("interval", "day")
    daysStr := c.DefaultQuery("days", "30")

    if err := dtos.ValidateInterval(interval); err != nil {
        logger.Error("Invalid interval parameter", ...)
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    days, err := strconv.Atoi(daysStr)
    if err != nil || days < 1 {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid days parameter"})
        return
    }

    // Finally, business logic...
    ctx := c.Request.Context()
    rows, err := database.Queries.FetchChartData(...)
    // ...
}
```

### After: Using Validation Helpers

```go
func GetUserChartData(c *gin.Context) {
    // Clean validation using helpers
    authenticatedUserID, err := validations.AuthenticatedUserID(c)
    if err != nil {
        logger.Error("Failed to extract authenticated user ID", "error", err.Error())
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
        return
    }

    requestedUserID, err := validations.UserIDParam(c, "userId")
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    if err := validations.ValidateUserAccess(authenticatedUserID, requestedUserID); err != nil {
        logger.Info("User attempted to access another user's chart data", ...)
        c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
        return
    }

    interval, err := validations.ChartIntervalParam(c)
    if err != nil {
        logger.Error("Invalid interval parameter", "error", err.Error())
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    days, err := validations.ChartDaysParam(c)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Business logic is now more prominent
    ctx := c.Request.Context()
    rows, err := database.Queries.FetchChartData(...)
    // ...
}
```

## Benefits

1. **Separation of Concerns**: Validation logic is separated from business logic
2. **Reusability**: Validation functions can be used across multiple handlers
3. **Testability**: Validation logic can be tested independently (see `request_validators_test.go`)
4. **Maintainability**: Changes to validation rules only need to be made in one place
5. **Readability**: Handlers are cleaner and easier to understand
6. **Consistency**: All handlers use the same validation patterns

## Files Changed

### New Files
- `validations/request_validators.go` - Request parameter validation helpers
- `validations/auth_validators.go` - Authorization validation helpers
- `validations/request_validators_test.go` - Unit tests for validation helpers

### Example Refactored Files
- `services/chart_service_refactored.go.example` - Shows how to use validators in chart service
- `controllers/user_info_controller_refactored.go.example` - Shows how to use validators in controllers

### Files to Update (when applying refactoring)
- `services/chart_service.go` - GetUserChartData, GetTeacherClassChartData
- `controllers/user_info_controller.go` - GetGeneralUserInfo
- `controllers/note_game_controller.go` - CreateNoteGameEntry, GetRecentNoteGameEntries

## Testing

All validation helpers have comprehensive unit tests:

```bash
cd core-api
go test ./validations/... -v
```

Tests cover:
- Success cases with valid inputs
- Error cases with invalid inputs
- Default value behavior
- Edge cases (zero, negative values, missing parameters)

## Next Steps

To apply this refactoring across the codebase:

1. Review the example files (.go.example)
2. Update imports in target files to include `sight-reading/validations`
3. Replace inline validation code with validation helper calls
4. Remove now-unused imports (like `strconv` if no longer needed)
5. Run tests to ensure behavior is unchanged
6. Update any integration tests if needed

## Additional Validation Patterns

The validation helpers can be extended for other common patterns:

```go
// Example: Validate pagination parameters
func PaginationParams(c *gin.Context) (page, pageSize int, err error)

// Example: Validate date range parameters
func DateRangeParams(c *gin.Context) (startDate, endDate time.Time, err error)

// Example: Validate sort parameters
func SortParams(c *gin.Context, allowedFields []string) (field, order string, err error)
```

These can be added to `request_validators.go` as needed.

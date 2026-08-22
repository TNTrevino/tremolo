# Validation Helpers - Quick Reference

## Import

```go
import "sight-reading/validations"
```

## Request Parameter Validators

### Extract Authenticated User ID from Context

```go
userID, err := validations.AuthenticatedUserID(c)
if err != nil {
    c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
    return
}
```

### Validate User ID from URL Parameter

```go
requestedUserID, err := validations.UserIDParam(c, "userId")
if err != nil {
    c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
    return
}
```

### Validate User Has Access

```go
if err := validations.ValidateUserAccess(authenticatedUserID, requestedUserID); err != nil {
    c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
    return
}
```

### Validate Integer Query Parameter

```go
// Generic: paramName, defaultValue, minValue
days, err := validations.IntQueryParam(c, "days", 30, 1)
if err != nil {
    c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
    return
}
```

### Validate Chart Interval Parameter

```go
// Validates: day, week, month, year, all (default: "day")
interval, err := validations.ChartIntervalParam(c)
if err != nil {
    c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
    return
}
```

### Validate Chart Days Parameter

```go
// Default: 30, Minimum: 1
days, err := validations.ChartDaysParam(c)
if err != nil {
    c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
    return
}
```

## Authorization Validators

### Validate Teacher Role

```go
ctx := c.Request.Context()
if err := validations.ValidateTeacherRole(ctx, userID); err != nil {
    if err.Error() == "user not found" {
        c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
        return
    }
    c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
    return
}
```

### Validate Specific Role (Generic)

```go
ctx := c.Request.Context()
if err := validations.ValidateUserRole(ctx, userID, validations.RoleTeacher); err != nil {
    c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
    return
}
```

### Available Role Constants

```go
validations.RoleTeacher
validations.RoleStudent
validations.RoleParent
validations.RoleAdmin
```

## Common Patterns

### User Resource Access Pattern

```go
func GetUserResource(c *gin.Context) {
    // 1. Get authenticated user
    authenticatedUserID, err := validations.AuthenticatedUserID(c)
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
        return
    }

    // 2. Get requested resource user ID
    requestedUserID, err := validations.UserIDParam(c, "userId")
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // 3. Validate access
    if err := validations.ValidateUserAccess(authenticatedUserID, requestedUserID); err != nil {
        c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
        return
    }

    // 4. Business logic...
}
```

### Chart Endpoint Pattern

```go
func GetChartData(c *gin.Context) {
    // 1. Validate user access (use pattern above)

    // 2. Validate chart parameters
    interval, err := validations.ChartIntervalParam(c)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    days, err := validations.ChartDaysParam(c)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // 3. Business logic...
}
```

### Teacher-Only Endpoint Pattern

```go
func GetTeacherResource(c *gin.Context) {
    // 1. Get authenticated user
    teacherID, err := validations.AuthenticatedUserID(c)
    if err != nil {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
        return
    }

    // 2. Validate teacher role
    ctx := c.Request.Context()
    if err := validations.ValidateTeacherRole(ctx, teacherID); err != nil {
        c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
        return
    }

    // 3. Business logic...
}
```

## Error Messages

All validators return descriptive error messages suitable for API responses:

- `"user ID not found in context"`
- `"user ID has invalid type"`
- `"invalid user ID parameter: must be a number"`
- `"invalid user ID parameter: must be positive"`
- `"access denied: cannot access another user's data"`
- `"invalid [param] parameter: must be a number"`
- `"invalid [param] parameter: must be at least [min]"`
- `"invalid interval '[value]': must be one of: day, week, month, year, all"`
- `"user not found"`
- `"access denied: only teachers can access this resource"`
- `"access denied: user does not have required role '[role]'"`

## Testing

Test any handler using these validators:

```bash
cd core-api
go test ./validations/... -v
```

All validators have comprehensive unit tests with 100% coverage.

package validations

import (
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestAuthenticatedUserID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("success - valid user ID", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("userID", 123)

		userID, err := AuthenticatedUserID(c)
		assert.NoError(t, err)
		assert.Equal(t, 123, userID)
	})

	t.Run("error - user ID not in context", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		userID, err := AuthenticatedUserID(c)
		assert.Error(t, err)
		assert.Equal(t, 0, userID)
		assert.Contains(t, err.Error(), "not found in context")
	})

	t.Run("error - user ID has invalid type", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Set("userID", "not-an-int")

		userID, err := AuthenticatedUserID(c)
		assert.Error(t, err)
		assert.Equal(t, 0, userID)
		assert.Contains(t, err.Error(), "invalid type")
	})
}

func TestUserIDParam(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("success - valid user ID parameter", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Params = []gin.Param{{Key: "userId", Value: "456"}}

		userID, err := UserIDParam(c, "userId")
		assert.NoError(t, err)
		assert.Equal(t, 456, userID)
	})

	t.Run("error - invalid user ID parameter (not a number)", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Params = []gin.Param{{Key: "userId", Value: "abc"}}

		userID, err := UserIDParam(c, "userId")
		assert.Error(t, err)
		assert.Equal(t, 0, userID)
		assert.Contains(t, err.Error(), "must be a number")
	})

	t.Run("error - negative user ID", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Params = []gin.Param{{Key: "userId", Value: "-1"}}

		userID, err := UserIDParam(c, "userId")
		assert.Error(t, err)
		assert.Equal(t, 0, userID)
		assert.Contains(t, err.Error(), "must be positive")
	})

	t.Run("error - zero user ID", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Params = []gin.Param{{Key: "userId", Value: "0"}}

		userID, err := UserIDParam(c, "userId")
		assert.Error(t, err)
		assert.Equal(t, 0, userID)
		assert.Contains(t, err.Error(), "must be positive")
	})
}

func TestValidateUserAccess(t *testing.T) {
	t.Run("success - matching user IDs", func(t *testing.T) {
		err := ValidateUserAccess(123, 123)
		assert.NoError(t, err)
	})

	t.Run("error - mismatched user IDs", func(t *testing.T) {
		err := ValidateUserAccess(123, 456)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "access denied")
	})
}

func TestIntQueryParam(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("success - valid integer parameter", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/?days=15", nil)

		days, err := IntQueryParam(c, "days", 30, 1)
		assert.NoError(t, err)
		assert.Equal(t, 15, days)
	})

	t.Run("success - uses default value when parameter not provided", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/", nil)

		days, err := IntQueryParam(c, "days", 30, 1)
		assert.NoError(t, err)
		assert.Equal(t, 30, days)
	})

	t.Run("error - non-integer parameter", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/?days=abc", nil)

		days, err := IntQueryParam(c, "days", 30, 1)
		assert.Error(t, err)
		assert.Equal(t, 0, days)
		assert.Contains(t, err.Error(), "must be a number")
	})

	t.Run("error - value below minimum", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/?days=0", nil)

		days, err := IntQueryParam(c, "days", 30, 1)
		assert.Error(t, err)
		assert.Equal(t, 0, days)
		assert.Contains(t, err.Error(), "must be at least")
	})
}

func TestChartIntervalParam(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("success - valid interval parameter", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/?interval=week", nil)

		interval, err := ChartIntervalParam(c)
		assert.NoError(t, err)
		assert.Equal(t, "week", interval)
	})

	t.Run("success - uses default value when parameter not provided", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/", nil)

		interval, err := ChartIntervalParam(c)
		assert.NoError(t, err)
		assert.Equal(t, "day", interval)
	})

	t.Run("error - invalid interval parameter", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/?interval=invalid", nil)

		interval, err := ChartIntervalParam(c)
		assert.Error(t, err)
		assert.Equal(t, "", interval)
		assert.Contains(t, err.Error(), "invalid interval")
	})
}

func TestChartDaysParam(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("success - valid days parameter", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/?days=7", nil)

		days, err := ChartDaysParam(c)
		assert.NoError(t, err)
		assert.Equal(t, 7, days)
	})

	t.Run("success - uses default value when parameter not provided", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/", nil)

		days, err := ChartDaysParam(c)
		assert.NoError(t, err)
		assert.Equal(t, 30, days)
	})

	t.Run("error - invalid days parameter", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("GET", "/?days=0", nil)

		days, err := ChartDaysParam(c)
		assert.Error(t, err)
		assert.Equal(t, 0, days)
	})
}

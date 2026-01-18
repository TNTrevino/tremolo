# Error Handling Examples

This document provides examples of how to use the error handling utilities in the Tremolo application.

## Table of Contents

1. [Using Error Utilities](#using-error-utilities)
2. [Using Toast Notifications](#using-toast-notifications)
3. [Using Error Boundaries](#using-error-boundaries)
4. [API Error Handling](#api-error-handling)
5. [Best Practices](#best-practices)

---

## Using Error Utilities

### Basic Error Message Extraction

```typescript
import { getErrorMessage, logError } from "@/shared/utils/error.utils";

try {
	// Some operation that might fail
	throw new Error("Something went wrong");
} catch (error) {
	const message = getErrorMessage(error);
	console.log(message); // "Something went wrong"

	// Log with context
	logError(error, "UserProfile.fetchData");
}
```

### Checking Error Types

```typescript
import {
	isApiError,
	isNetworkError,
	isAuthError,
	isValidationError,
	hasStatusCode,
} from "@/shared/utils/error.utils";

try {
	await api.updateUser(userData);
} catch (error) {
	if (isAuthError(error)) {
		// Redirect to login
		navigate("/login");
	} else if (isNetworkError(error)) {
		showToast("Please check your internet connection", "error");
	} else if (isValidationError(error)) {
		showToast("Please check your input", "warning");
	} else if (hasStatusCode(error, 429)) {
		showToast("Too many requests. Please wait.", "warning");
	}
}
```

---

## Using Toast Notifications

### Basic Usage in Components

```typescript
import { useToast } from '@/shared/hooks/useToast';

function MyComponent() {
  const { showSuccess, showError, showWarning, showInfo } = useToast();

  const handleSubmit = async () => {
    try {
      await submitData();
      showSuccess('Data saved successfully!');
    } catch (error) {
      showError(getErrorMessage(error), 'Save Failed');
    }
  };

  return <button onClick={handleSubmit}>Save</button>;
}
```

### Custom Toast with Duration

```typescript
import { useToast } from '@/shared/hooks/useToast';

function NotificationExample() {
  const { showToast } = useToast();

  const showCustomToast = () => {
    // Show toast for 10 seconds
    showToast('This is a custom message', 'info', 'Custom Title', 10000);
  };

  return <button onClick={showCustomToast}>Show Toast</button>;
}
```

### Toast in API Calls

```typescript
import { useToast } from '@/shared/hooks/useToast';
import { getErrorMessage } from '@/shared/utils/error.utils';

function UserForm() {
  const { showSuccess, showError } = useToast();

  const handleSave = async (formData: UserData) => {
    try {
      await userService.update(formData);
      showSuccess('Profile updated successfully!', 'Success');
    } catch (error) {
      const message = getErrorMessage(error);
      showError(message, 'Update Failed');
      logError(error, 'UserForm.handleSave');
    }
  };

  return <form onSubmit={handleSave}>...</form>;
}
```

---

## Using Error Boundaries

### Wrapping Routes (Already implemented in App.tsx)

```typescript
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<HomePage />} />
        {/* ... other routes */}
      </Routes>
    </ErrorBoundary>
  );
}
```

### Wrapping Specific Components

```typescript
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';

function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Wrap risky component */}
      <ErrorBoundary>
        <ComplexChart data={chartData} />
      </ErrorBoundary>

      {/* Wrap another risky component */}
      <ErrorBoundary>
        <UserStatistics userId={userId} />
      </ErrorBoundary>
    </div>
  );
}
```

### Using Higher-Order Component

```typescript
import { withErrorBoundary } from '@/shared/components/ErrorBoundary';

function RiskyComponent() {
  // Component that might throw errors
  return <div>...</div>;
}

// Wrap with error boundary
export default withErrorBoundary(RiskyComponent);
```

### Custom Fallback UI

```typescript
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';

function CustomFallback() {
  return (
    <div className="p-4 text-center">
      <p>Unable to load chart. Please try again later.</p>
    </div>
  );
}

function ChartWidget() {
  return (
    <ErrorBoundary fallback={<CustomFallback />}>
      <ComplexChart />
    </ErrorBoundary>
  );
}
```

### Error Callback

```typescript
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';

function ParentComponent() {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    // Send to analytics/monitoring service
    analytics.trackError({
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  };

  return (
    <ErrorBoundary onError={handleError}>
      <ChildComponent />
    </ErrorBoundary>
  );
}
```

---

## API Error Handling

### Using React Query with Error Handling

```typescript
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks/useToast';
import { getErrorMessage, logError } from '@/shared/utils/error.utils';

function UserProfile() {
  const { showError, showSuccess } = useToast();

  // Query with error handling
  const { data, error, isError } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => userService.getUser(userId),
    onError: (error) => {
      logError(error, 'UserProfile.fetchUser');
      showError(getErrorMessage(error), 'Failed to load user');
    },
  });

  // Mutation with error handling
  const updateMutation = useMutation({
    mutationFn: userService.updateUser,
    onSuccess: () => {
      showSuccess('User updated successfully!');
    },
    onError: (error) => {
      logError(error, 'UserProfile.updateUser');
      showError(getErrorMessage(error), 'Update Failed');
    },
  });

  if (isError) {
    return <div>Error: {getErrorMessage(error)}</div>;
  }

  return <div>...</div>;
}
```

### Axios Interceptor for Global Error Handling

```typescript
// In your API service file
import axios from "axios";
import { getErrorMessage, logError } from "@/shared/utils/error.utils";

const apiClient = axios.create({
	baseURL: import.meta.env.VITE_API_URL,
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
	(response) => response,
	(error) => {
		// Log all API errors
		logError(error, "API Request");

		// Handle specific error types globally
		if (error.response?.status === 401) {
			// Redirect to login or refresh token
			window.location.href = "/login";
		}

		return Promise.reject(error);
	},
);
```

### Form Submission with Error Handling

```typescript
import { useToast } from '@/shared/hooks/useToast';
import { getErrorMessage, isValidationError } from '@/shared/utils/error.utils';

function LoginForm() {
  const { showError, showSuccess } = useToast();
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (formData: LoginData) => {
    try {
      setFormErrors({});
      const response = await authService.login(formData);
      showSuccess('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      if (isValidationError(error)) {
        // Handle field-specific validation errors
        const fieldErrors = extractFieldErrors(error);
        setFormErrors(fieldErrors);
        showError('Please check the form for errors', 'Validation Error');
      } else {
        // General error
        showError(getErrorMessage(error), 'Login Failed');
      }
      logError(error, 'LoginForm.handleSubmit');
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

---

## Best Practices

### 1. Always Log Errors with Context

```typescript
// ✅ Good - includes context
try {
	await updateUser(data);
} catch (error) {
	logError(error, "UserSettings.updateProfile");
	showError(getErrorMessage(error));
}

// ❌ Bad - no context
try {
	await updateUser(data);
} catch (error) {
	console.error(error);
}
```

### 2. Use Specific Error Checks

```typescript
// ✅ Good - specific error handling
try {
	await api.call();
} catch (error) {
	if (isAuthError(error)) {
		navigate("/login");
	} else if (isNetworkError(error)) {
		showRetryDialog();
	} else {
		showError(getErrorMessage(error));
	}
}

// ❌ Bad - generic handling
try {
	await api.call();
} catch (error) {
	showError("Something went wrong");
}
```

### 3. Provide User-Friendly Messages

```typescript
// ✅ Good - user-friendly message
showError("Unable to save your profile. Please try again.", "Save Failed");

// ❌ Bad - technical message
showError(error.stack, "Error");
```

### 4. Use Error Boundaries for Component Isolation

```typescript
// ✅ Good - isolated error boundaries
<div>
  <ErrorBoundary>
    <CriticalFeature />
  </ErrorBoundary>
  <ErrorBoundary>
    <AnotherFeature />
  </ErrorBoundary>
</div>

// ❌ Bad - one error crashes everything
<div>
  <CriticalFeature />
  <AnotherFeature />
</div>
```

### 5. Don't Swallow Errors

```typescript
// ✅ Good - errors are logged and handled
try {
	await riskyOperation();
} catch (error) {
	logError(error, "Component.riskyOperation");
	showError(getErrorMessage(error));
	// Optionally rethrow if needed
	throw error;
}

// ❌ Bad - error is swallowed
try {
	await riskyOperation();
} catch (error) {
	// Silent failure
}
```

### 6. Combine Toast + Error Boundary

```typescript
// Use toast for recoverable errors (API calls, form validation)
// Use error boundary for render errors (component crashes)

function DataDisplay() {
  const { showError } = useToast();

  const { data, isError, error } = useQuery({
    queryKey: ['data'],
    queryFn: fetchData,
    onError: (error) => {
      // Toast for API error
      showError(getErrorMessage(error), 'Failed to load data');
    },
  });

  // Error boundary will catch render errors
  return (
    <ErrorBoundary>
      <ComplexVisualization data={data} />
    </ErrorBoundary>
  );
}
```

---

## Testing Error Handling

### Simulating Errors in Development

```typescript
// Create a component that throws an error for testing
function ErrorTester() {
  const { showError, showSuccess } = useToast();

  const testError = () => {
    throw new Error('Test error for ErrorBoundary');
  };

  const testToast = () => {
    showError('This is a test error toast', 'Test');
  };

  const testApiError = async () => {
    try {
      throw new Error('API Error Test');
    } catch (error) {
      logError(error, 'ErrorTester');
      showError(getErrorMessage(error));
    }
  };

  return (
    <div className="p-4 space-y-2">
      <button onClick={testError}>Test Error Boundary</button>
      <button onClick={testToast}>Test Toast</button>
      <button onClick={testApiError}>Test API Error</button>
    </div>
  );
}
```

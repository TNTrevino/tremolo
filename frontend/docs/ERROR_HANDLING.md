# Error Handling Documentation

> Comprehensive guide to error handling patterns, utilities, and best practices in the Tremolo application.

## Table of Contents

1. [Overview](#overview)
2. [Error Utilities](#error-utilities)
3. [Custom Error Classes](#custom-error-classes)
4. [Hooks](#hooks)
5. [Error Boundaries](#error-boundaries)
6. [Patterns and Best Practices](#patterns-and-best-practices)
7. [Common Scenarios](#common-scenarios)
8. [Migration Guide](#migration-guide)

---

## Overview

### Error Handling Philosophy

The Tremolo application implements a **centralized, standardized approach** to error handling that provides:

- **Consistency**: All errors are handled using the same utilities and patterns
- **User-Friendly Messages**: Technical errors are translated into clear, actionable messages
- **Developer Experience**: Comprehensive logging with context for debugging
- **Type Safety**: TypeScript integration for compile-time error checking
- **Graceful Degradation**: Errors don't crash the app; users can recover

### Benefits of Standardized Error Handling

✅ **Predictable Error Behavior** - Developers know exactly how to handle errors across the codebase  
✅ **Reduced Boilerplate** - Reusable hooks and utilities eliminate repetitive try/catch blocks  
✅ **Better User Experience** - Consistent error messages and recovery options  
✅ **Easier Debugging** - Structured logging with context helps identify issues quickly  
✅ **Production-Ready** - Built-in support for error tracking services (e.g., Sentry)

---

## Error Utilities

All error utilities are located in `src/shared/utils/error.utils.ts`.

### `getErrorMessage(error: unknown): string`

Extracts a user-friendly error message from any error type.

**Use Cases:**

- Converting API errors to display messages
- Handling unknown error types
- Providing fallback messages

**Examples:**

```typescript
import { getErrorMessage } from "@/shared/utils/error.utils";

// With Error object
try {
	throw new Error("Something went wrong");
} catch (error) {
	const message = getErrorMessage(error);
	console.log(message); // "Something went wrong"
}

// With Axios/API error
try {
	await api.fetchData();
} catch (error) {
	const message = getErrorMessage(error);
	// Returns: "Bad request. Please check your input." (for 400)
	// Or: "You are not authorized. Please log in." (for 401)
	// Or custom message from response.data.message
}

// With string
const message = getErrorMessage("Network connection lost");
// Returns: "Network connection lost"

// With unknown type
const message = getErrorMessage({ code: 123 });
// Returns: "An unexpected error occurred. Please try again."
```

**HTTP Status Code Handling:**

| Status Code | User Message                                        |
| ----------- | --------------------------------------------------- |
| 400         | Bad request. Please check your input.               |
| 401         | You are not authorized. Please log in.              |
| 403         | You do not have permission to perform this action.  |
| 404         | The requested resource was not found.               |
| 408         | Request timeout. Please try again.                  |
| 429         | Too many requests. Please wait a moment.            |
| 500         | Internal server error. Please try again later.      |
| 502         | Bad gateway. The server is temporarily unavailable. |
| 503         | Service unavailable. Please try again later.        |

---

### `logError(error: unknown, context?: string): void`

Logs errors to the console with structured information and context.

**Parameters:**

- `error` - The error to log (any type)
- `context` - Optional context string (e.g., "SheetMusicPage.generateMary")

**Behavior:**

- **Development**: Logs detailed error information including stack traces and API details
- **Production**: Logs simplified error messages (can be extended to send to Sentry/logging service)

**Examples:**

```typescript
import { logError } from "@/shared/utils/error.utils";

// Basic usage
try {
	await fetchUserData();
} catch (error) {
	logError(error); // Logs with no context
}

// With context (recommended)
try {
	await musicService.generateMary({ tonic: "C", octave: 4 });
} catch (error) {
	logError(error, "SheetMusicPage.generateMary");
	// Development: Shows grouped console output with request/response details
	// Production: Logs "Error occurred: <message>"
}

// In event handlers
const handleSubmit = async () => {
	try {
		await submitForm(formData);
	} catch (error) {
		logError(error, "ProfileForm.handleSubmit");
	}
};
```

**Development Console Output:**

```
🔴 Error in SheetMusicPage.generateMary
  AxiosError: Request failed with status code 500
    Request config: {...}
    Response: {...}
```

---

### Type Guard Functions

#### `isApiError(error: unknown): error is AxiosError`

Checks if an error is an Axios/API error.

```typescript
import { isApiError } from "@/shared/utils/error.utils";

try {
	await api.getData();
} catch (error) {
	if (isApiError(error)) {
		console.log("Status:", error.response?.status);
		console.log("Data:", error.response?.data);
	}
}
```

#### `isNetworkError(error: unknown): boolean`

Checks if an error is a network connectivity error.

```typescript
import { isNetworkError } from "@/shared/utils/error.utils";

try {
	await api.fetchData();
} catch (error) {
	if (isNetworkError(error)) {
		showToast("Please check your internet connection", "error");
	}
}
```

#### `isAuthError(error: unknown): boolean`

Checks if an error is an authentication/authorization error (401/403).

```typescript
import { isAuthError } from "@/shared/utils/error.utils";

try {
	await api.getProtectedResource();
} catch (error) {
	if (isAuthError(error)) {
		// Redirect to login
		navigate("/login");
	}
}
```

#### `isValidationError(error: unknown): boolean`

Checks if an error is a validation error (400/422).

```typescript
import { isValidationError } from "@/shared/utils/error.utils";

try {
	await api.submitForm(data);
} catch (error) {
	if (isValidationError(error)) {
		// Show inline validation errors
		setFormErrors(error.response?.data?.errors);
	}
}
```

#### `hasStatusCode(error: unknown, statusCode: number): boolean`

Checks if an error has a specific HTTP status code.

```typescript
import { hasStatusCode } from "@/shared/utils/error.utils";

try {
	await api.deleteResource();
} catch (error) {
	if (hasStatusCode(error, 404)) {
		showToast("Resource not found", "error");
	}
}
```

---

## Custom Error Classes

Custom error classes are located in `src/shared/errors/`.

### When to Use Custom Errors

Use custom error classes when you need to:

- **Differentiate error types** programmatically (e.g., retry logic for network errors)
- **Add domain-specific metadata** (e.g., which field failed validation)
- **Provide better error context** for debugging

### NetworkError

**File:** `src/shared/errors/NetworkError.ts`

**Purpose:** Network-related failures including timeouts, connection issues, and HTTP errors.

**Properties:**

- `name: "NetworkError"`
- `statusCode?: number` - HTTP status code (if applicable)
- `isTimeout?: boolean` - Whether this was a timeout error

**Examples:**

```typescript
import { NetworkError } from "@/shared/errors";

// Throwing a network error
throw new NetworkError("Failed to connect to server", {
	statusCode: 503,
	isTimeout: false,
});

// With timeout
throw new NetworkError("Request timed out", {
	isTimeout: true,
});

// Catching and handling
try {
	await api.fetchData();
} catch (error) {
	if (error instanceof NetworkError) {
		if (error.isTimeout) {
			showToast("Request timed out. Please try again.", "error");
		} else {
			showToast("Network error. Check your connection.", "error");
		}
	}
}
```

---

### AuthenticationError

**File:** `src/shared/errors/AuthenticationError.ts`

**Purpose:** Authentication and authorization failures (401/403).

**Properties:**

- `name: "AuthenticationError"`
- `statusCode?: number` - HTTP status code (401 or 403)

**Examples:**

```typescript
import { AuthenticationError } from "@/shared/errors";

// Throwing an auth error
throw new AuthenticationError("Invalid credentials", { statusCode: 401 });

// Catching and handling
try {
	await api.login(credentials);
} catch (error) {
	if (error instanceof AuthenticationError) {
		if (error.statusCode === 401) {
			setFormError("Invalid email or password");
		} else if (error.statusCode === 403) {
			setFormError("Access denied");
		}
	}
}
```

---

### ValidationError

**File:** `src/shared/errors/ValidationError.ts`

**Purpose:** Validation failures and malformed data (400/422).

**Properties:**

- `name: "ValidationError"`
- `field?: string` - The specific field that failed validation
- `statusCode?: number` - HTTP status code (400 or 422)

**Examples:**

```typescript
import { ValidationError } from "@/shared/errors";

// Throwing a validation error
throw new ValidationError("Email is required", {
	field: "email",
	statusCode: 400,
});

// Catching and handling
try {
	await api.updateProfile(profileData);
} catch (error) {
	if (error instanceof ValidationError) {
		if (error.field) {
			// Show error next to specific field
			setFieldError(error.field, error.message);
		} else {
			// Show general form error
			setFormError(error.message);
		}
	}
}
```

---

### MusicGenerationError

**File:** `src/shared/errors/MusicGenerationError.ts`

**Purpose:** Music generation service failures.

**Properties:**

- `name: "MusicGenerationError"`
- `context?: Record<string, unknown>` - Additional context about the generation attempt

**Examples:**

```typescript
import { MusicGenerationError } from "@/shared/errors";

// Throwing a music generation error
throw new MusicGenerationError("Failed to generate note", {
	context: { scale: "C", octave: 4, rhythm: "1111" },
});

// Catching and handling
try {
	const xml = await musicService.generateRandom(params);
} catch (error) {
	if (error instanceof MusicGenerationError) {
		console.error("Generation context:", error.context);
		showToast(
			"Failed to generate music. Please try different settings.",
			"error",
		);
	}
}
```

---

## Hooks

### useErrorState

**File:** `src/shared/hooks/useErrorState.ts`

**Purpose:** Manage error state in components with standardized error handling.

**API Reference:**

```typescript
interface UseErrorStateReturn {
	/** The full error object for debugging */
	error: Error | null;

	/** Extracted message for display */
	errorMessage: string | null;

	/** Set error state from any error type */
	setError: (error: Error | string | unknown) => void;

	/** Clear error state */
	clearError: () => void;
}

function useErrorState(): UseErrorStateReturn;
```

**When to Use:**

- ✅ Managing error state in page components
- ✅ Displaying inline error messages
- ✅ Showing errors in forms
- ❌ One-off async operations (use `useAsyncHandler` instead)

**Example Usage:**

```typescript
import { useErrorState } from '@/shared/hooks/useErrorState';
import { Alert } from '@/components/ui/alert';

function MyComponent() {
  const { error, errorMessage, setError, clearError } = useErrorState();
  const [data, setData] = useState(null);

  const fetchData = async () => {
    try {
      clearError(); // Clear previous errors
      const result = await api.getData();
      setData(result);
    } catch (err) {
      setError(err); // Accepts Error, string, or unknown
    }
  };

  return (
    <div>
      {errorMessage && (
        <Alert severity="error" onClose={clearError}>
          {errorMessage}
        </Alert>
      )}
      <button onClick={fetchData}>Fetch Data</button>
    </div>
  );
}
```

---

### useAsyncHandler

**File:** `src/shared/hooks/useAsyncHandler.ts`

**Purpose:** Centralized async handler that wraps try/catch patterns with automatic error handling, logging, and loading states.

**API Reference:**

```typescript
interface ExecuteOptions<T> {
	/** Context for logging (e.g., "SheetMusicPage.generateMary") */
	context?: string;

	/** Callback executed after successful completion */
	onSuccess?: (result: T) => void;

	/** Optional error handler override */
	onError?: (error: Error) => void;

	/** Whether to show an error toast (default: false) */
	showToast?: boolean;
}

interface AsyncHandlerReturn {
	/** Executes an async function with error handling */
	execute: <T>(
		fn: () => Promise<T>,
		options?: ExecuteOptions<T>,
	) => Promise<T | void>;

	/** Current loading state */
	isLoading: boolean;

	/** Current error state */
	error: Error | null;
}

function useAsyncHandler(): AsyncHandlerReturn;
```

**When to Use:**

- ✅ Background operations (API calls, file uploads)
- ✅ Operations that need toast notifications
- ✅ Operations with success callbacks
- ✅ Reducing try/catch boilerplate
- ❌ Simple synchronous operations

**When to Use vs Manual Try/Catch:**

| Use `useAsyncHandler`      | Use Manual Try/Catch                              |
| -------------------------- | ------------------------------------------------- |
| Background API calls       | Complex error handling with multiple catch blocks |
| Toast notifications needed | Need to set multiple state variables in catch     |
| Standard error patterns    | Custom error recovery logic                       |
| Want automatic logging     | Already using `useErrorState` for inline errors   |

**Example Usage:**

```typescript
import { useAsyncHandler } from '@/shared/hooks/useAsyncHandler';

function SheetMusicPage() {
  const { execute, isLoading, error } = useAsyncHandler();
  const [musicXml, setMusicXml] = useState('');

  const handleGenerateMary = async () => {
    await execute(
      () => musicService.generateMary({ tonic: 'C', octave: 4 }),
      {
        context: 'SheetMusicPage.generateMary',
        onSuccess: (xml) => {
          setMusicXml(xml);
          showToast('Music generated successfully!', 'success');
        },
        showToast: true // Show error toast on failure
      }
    );
  };

  return (
    <div>
      {error && <Alert severity="error">{error.message}</Alert>}
      <Button onClick={handleGenerateMary} disabled={isLoading}>
        {isLoading ? 'Generating...' : 'Generate Music'}
      </Button>
    </div>
  );
}
```

**Before/After Example:**

**Before (Manual Try/Catch):**

```typescript
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<Error | null>(null);

const handleSubmit = async () => {
	setIsLoading(true);
	setError(null);

	try {
		const result = await api.submitData(formData);
		console.log("Success:", result);
		showToast("Data submitted successfully!", "success");
	} catch (err) {
		console.error("Error in handleSubmit:", err);
		const errorObj = err instanceof Error ? err : new Error(String(err));
		setError(errorObj);
		showToast(errorObj.message, "error");
	} finally {
		setIsLoading(false);
	}
};
```

**After (Using useAsyncHandler):**

```typescript
const { execute, isLoading, error } = useAsyncHandler();

const handleSubmit = async () => {
	await execute(() => api.submitData(formData), {
		context: "MyComponent.handleSubmit",
		onSuccess: (result) => {
			console.log("Success:", result);
			showToast("Data submitted successfully!", "success");
		},
		showToast: true,
	});
};
```

---

## Error Boundaries

### App-Level vs Component-Level Boundaries

**When to use each:**

| App-Level ErrorBoundary      | Component-Level ErrorBoundary            |
| ---------------------------- | ---------------------------------------- |
| Wrap entire app in main.tsx  | Wrap risky third-party components        |
| Catch catastrophic errors    | Isolate errors to prevent full app crash |
| Show full-page error UI      | Show component-level fallback UI         |
| Provide "Reload Page" option | Provide "Try Again" option               |

---

### ErrorBoundary

**File:** `src/shared/components/ErrorBoundary.tsx`

**Purpose:** Catch JavaScript errors in child components, log them, and display fallback UI.

**Props:**

- `children: ReactNode` - Components to protect
- `fallback?: ReactNode` - Custom fallback UI (optional)
- `onError?: (error: Error, errorInfo: ErrorInfo) => void` - Error callback (optional)

**Features:**

- ✅ Catches React component errors
- ✅ Displays user-friendly error UI
- ✅ Shows stack trace in development mode
- ✅ Provides "Try Again", "Reload Page", and "Go Home" options
- ✅ Logs errors with context

**Example Usage:**

```typescript
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';

// Basic usage
function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* Your app routes */}
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

// With custom fallback
function MyPage() {
  return (
    <ErrorBoundary fallback={<div>Something went wrong in this section</div>}>
      <ComplexComponent />
    </ErrorBoundary>
  );
}

// With error callback
function MyComponent() {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    // Send to error tracking service
    trackError(error, errorInfo);
  };

  return (
    <ErrorBoundary onError={handleError}>
      <RiskyComponent />
    </ErrorBoundary>
  );
}
```

**Higher-Order Component:**

```typescript
import { withErrorBoundary } from '@/shared/components/ErrorBoundary';

const SafeComponent = withErrorBoundary(MyComponent);

// With custom fallback
const SafeComponent = withErrorBoundary(
  MyComponent,
  <div>Error loading component</div>
);
```

---

### ComponentErrorBoundary

**File:** `src/shared/components/ComponentErrorBoundary.tsx`

**Purpose:** Lightweight wrapper around ErrorBoundary for component-level error handling.

**Props:**

- `children: ReactNode` - Components to protect
- `fallback?: ReactNode` - Custom fallback UI (optional)
- `onError?: (error: Error, errorInfo: ErrorInfo) => void` - Error callback (optional)

**When to Use:**

- ✅ Wrapping third-party components (e.g., OpenSheetMusicDisplay)
- ✅ Isolating risky features
- ✅ Preventing errors from bubbling up
- ✅ Providing component-specific error UI

**Example Usage:**

```typescript
import { ComponentErrorBoundary } from '@/shared/components/ComponentErrorBoundary';

function SheetMusicDisplay({ musicXml }: Props) {
  return (
    <ComponentErrorBoundary
      fallback={
        <div className="error-card">
          <p>Failed to render sheet music</p>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      }
      onError={(error) => console.error('Sheet music error:', error)}
    >
      <OpenSheetMusicDisplay xml={musicXml} />
    </ComponentErrorBoundary>
  );
}
```

---

### Creating Custom Fallback Components

**Example: Custom Error Card**

```typescript
function ErrorCard({ error, onRetry }: { error?: Error; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border-2 border-red-200 bg-red-50 p-6">
      <div className="flex items-center gap-3 mb-4">
        <AlertCircle className="h-6 w-6 text-red-600" />
        <h3 className="text-lg font-semibold text-red-900">
          Something went wrong
        </h3>
      </div>

      {error && (
        <p className="text-sm text-red-800 mb-4">{error.message}</p>
      )}

      <div className="flex gap-2">
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            Try Again
          </Button>
        )}
        <Button onClick={() => window.location.reload()} variant="default">
          Reload Page
        </Button>
      </div>
    </div>
  );
}

// Usage
<ComponentErrorBoundary fallback={<ErrorCard />}>
  <RiskyComponent />
</ComponentErrorBoundary>
```

---

## Patterns and Best Practices

### Toast vs Inline Errors

**When to use Toast Notifications:**

- ✅ Background operations (saving data, uploading files)
- ✅ Success messages
- ✅ Non-critical errors (can continue using app)
- ✅ Network connectivity issues
- ✅ Temporary errors (rate limiting, timeouts)

**When to use Inline Errors:**

- ✅ Form validation errors
- ✅ Required user input
- ✅ Critical blocking errors
- ✅ Field-specific errors
- ✅ Errors that need user action

**Examples:**

```typescript
// ✅ Toast for background operation
const { execute } = useAsyncHandler();

const handleSaveSettings = async () => {
  await execute(
    () => api.saveSettings(settings),
    {
      context: 'SettingsPage.handleSave',
      showToast: true, // Show toast on success/error
      onSuccess: () => {
        showToast('Settings saved successfully!', 'success');
      }
    }
  );
};

// ✅ Inline for form validation
const { errorMessage, setError, clearError } = useErrorState();

const handleSubmit = async () => {
  clearError();

  if (!email) {
    setError('Email is required');
    return;
  }

  try {
    await api.submitForm({ email });
  } catch (err) {
    setError(err); // Show inline
  }
};

return (
  <div>
    {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
    <Button onClick={handleSubmit}>Submit</Button>
  </div>
);
```

---

### Logging Requirements

**Always use `logError()` instead of `console.error`:**

❌ **Don't:**

```typescript
try {
	await fetchData();
} catch (error) {
	console.error(error); // Hard to find, no context
}
```

✅ **Do:**

```typescript
import { logError } from "@/shared/utils/error.utils";

try {
	await fetchData();
} catch (error) {
	logError(error, "MyComponent.fetchData"); // Structured logging with context
}
```

**Include context string:**

The context string should follow the pattern: `ComponentName.functionName`

```typescript
logError(error, "SheetMusicPage.generateMary");
logError(error, "NoteGamePage.handleAnswer");
logError(error, "ProfileForm.handleSubmit");
```

**Development vs Production Behavior:**

| Environment     | Behavior                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| **Development** | Full error details, stack traces, API request/response info, grouped console output                    |
| **Production**  | Simplified error message, ready for integration with error tracking services (Sentry, LogRocket, etc.) |

---

### Error Display Hierarchy

Errors should be handled in the following order (top to bottom):

1. **Error Boundaries** - Catch React component errors
   - Prevents entire app from crashing
   - Shows full-page or component-level error UI

2. **Try/Catch in Async Operations** - Catch promise rejections
   - Handle API errors
   - Handle validation errors
   - Handle network errors

3. **Error States in Components** - Display inline errors
   - Form validation errors
   - Field-specific errors
   - Critical blocking errors

4. **Toast Notifications** - Background operations
   - Non-blocking errors
   - Success messages
   - Temporary issues

**Example:**

```typescript
// 1. Error Boundary (top level)
<ErrorBoundary>

  {/* 2. Try/Catch in async operations */}
  <MyComponent />

</ErrorBoundary>

// Inside MyComponent:
function MyComponent() {
  const { errorMessage, setError, clearError } = useErrorState();
  const { showToast } = useToast();

  const handleSubmit = async () => {
    try {
      await api.submitData(data);

      // 4. Toast for success
      showToast('Data submitted successfully!', 'success');
    } catch (error) {
      logError(error, 'MyComponent.handleSubmit');

      if (isValidationError(error)) {
        // 3. Inline error for validation
        setError(error);
      } else {
        // 4. Toast for background error
        showToast(getErrorMessage(error), 'error');
      }
    }
  };

  return (
    <div>
      {/* 3. Inline error display */}
      {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}
```

---

## Common Scenarios

### 1. Handling API Errors in a Page Component

```typescript
import { useErrorState } from '@/shared/hooks/useErrorState';
import { logError, getErrorMessage } from '@/shared/utils/error.utils';
import { musicService } from '@/services/api';

function SheetMusicPage() {
  const { errorMessage, setError, clearError } = useErrorState();
  const [musicXml, setMusicXml] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    clearError();

    try {
      const xml = await musicService.generateMary({
        tonic: 'C',
        octave: 4
      });
      setMusicXml(xml);
    } catch (error) {
      logError(error, 'SheetMusicPage.handleGenerate');
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {errorMessage && (
        <Alert severity="error" onClose={clearError}>
          {errorMessage}
        </Alert>
      )}

      <Button onClick={handleGenerate} disabled={isLoading}>
        {isLoading ? 'Generating...' : 'Generate Music'}
      </Button>

      {musicXml && <SheetMusicDisplay musicXml={musicXml} />}
    </div>
  );
}
```

---

### 2. Handling Form Validation Errors

```typescript
import { useErrorState } from '@/shared/hooks/useErrorState';
import { isValidationError, logError } from '@/shared/utils/error.utils';
import { ValidationError } from '@/shared/errors';

function ProfileForm() {
  const { errorMessage, setError, clearError } = useErrorState();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Email is invalid';
    }

    if (!name) {
      errors.name = 'Name is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    // Client-side validation
    if (!validateForm()) {
      setError('Please fix the errors below');
      return;
    }

    try {
      await api.updateProfile({ email, name });
      showToast('Profile updated successfully!', 'success');
    } catch (error) {
      logError(error, 'ProfileForm.handleSubmit');

      if (isValidationError(error)) {
        // Server-side validation error
        setError(error);
      } else {
        // Other errors
        setError('Failed to update profile. Please try again.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {errorMessage && (
        <Alert severity="error" onClose={clearError}>
          {errorMessage}
        </Alert>
      )}

      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldErrors.email}
      />

      <Input
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={fieldErrors.name}
      />

      <Button type="submit">Update Profile</Button>
    </form>
  );
}
```

---

### 3. Handling Background Operations

```typescript
import { useAsyncHandler } from '@/shared/hooks/useAsyncHandler';
import { useToast } from '@/shared/hooks/useToast';

function SettingsPage() {
  const { execute, isLoading } = useAsyncHandler();
  const { showToast } = useToast();
  const [settings, setSettings] = useState({});

  const handleSaveSettings = async () => {
    await execute(
      () => api.saveSettings(settings),
      {
        context: 'SettingsPage.handleSaveSettings',
        onSuccess: () => {
          showToast('Settings saved successfully!', 'success');
        },
        showToast: true // Show error toast on failure
      }
    );
  };

  const handleExportData = async () => {
    await execute(
      () => api.exportUserData(),
      {
        context: 'SettingsPage.handleExportData',
        onSuccess: (data) => {
          // Download the exported data
          downloadFile(data, 'user-data.json');
          showToast('Data exported successfully!', 'success');
        },
        showToast: true
      }
    );
  };

  return (
    <div>
      <h1>Settings</h1>

      <Button onClick={handleSaveSettings} disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save Settings'}
      </Button>

      <Button onClick={handleExportData} disabled={isLoading}>
        Export Data
      </Button>
    </div>
  );
}
```

---

### 4. Handling File Upload Errors

```typescript
import { useErrorState } from '@/shared/hooks/useErrorState';
import { logError } from '@/shared/utils/error.utils';
import { ValidationError } from '@/shared/errors';

function FileUploadPage() {
  const { errorMessage, setError, clearError } = useErrorState();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const validateFile = (file: File): void => {
    const validExtensions = ['.xml', '.musicxml', '.mxl'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => fileName.endsWith(ext));

    if (!isValid) {
      throw new ValidationError(
        'Invalid file type. Please upload a MusicXML file (.xml, .musicxml, or .mxl)',
        { field: 'file' }
      );
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new ValidationError(
        'File is too large. Maximum size is 5MB.',
        { field: 'file' }
      );
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    clearError();

    if (!selectedFile) return;

    try {
      // Validate file
      validateFile(selectedFile);

      // Read file
      setIsUploading(true);
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;

          // Additional validation
          if (!content || !content.trim().startsWith('<?xml')) {
            throw new ValidationError('Invalid file format. The file does not appear to be a valid XML file.');
          }

          // Process file
          setFile(selectedFile);
          setIsUploading(false);
        } catch (error) {
          logError(error, 'FileUploadPage.reader.onload');
          setError(error);
          setIsUploading(false);
        }
      };

      reader.onerror = () => {
        const error = new Error('Failed to read the file. Please try again.');
        logError(error, 'FileUploadPage.reader.onerror');
        setError(error);
        setIsUploading(false);
      };

      reader.readAsText(selectedFile);
    } catch (error) {
      logError(error, 'FileUploadPage.handleFileUpload');
      setError(error);
    }
  };

  return (
    <div>
      {errorMessage && (
        <Alert severity="error" onClose={clearError}>
          {errorMessage}
        </Alert>
      )}

      <Input
        type="file"
        accept=".xml,.musicxml,.mxl"
        onChange={handleFileUpload}
        disabled={isUploading}
      />

      {isUploading && <p>Uploading...</p>}
      {file && <p>Uploaded: {file.name}</p>}
    </div>
  );
}
```

---

### 5. Wrapping a Third-Party Component

```typescript
import { ComponentErrorBoundary } from '@/shared/components/ComponentErrorBoundary';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import { useEffect, useRef } from 'react';

interface SheetMusicDisplayProps {
  musicXml: string;
  onError?: (error: Error) => void;
}

function SheetMusicDisplay({ musicXml, onError }: SheetMusicDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !musicXml) return;

    const osmd = new OpenSheetMusicDisplay(containerRef.current);

    osmd
      .load(musicXml)
      .then(() => {
        osmd.render();
      })
      .catch((error) => {
        console.error('Error rendering sheet music:', error);
        onError?.(error);
      });

    return () => {
      osmd.clear();
    };
  }, [musicXml, onError]);

  return <div ref={containerRef} />;
}

// Wrapped version with error boundary
function SafeSheetMusicDisplay({ musicXml, onError }: SheetMusicDisplayProps) {
  return (
    <ComponentErrorBoundary
      fallback={
        <div className="error-card">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <p>Failed to render sheet music</p>
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </div>
      }
      onError={(error) => {
        console.error('Sheet music error:', error);
        onError?.(error);
      }}
    >
      <SheetMusicDisplay musicXml={musicXml} onError={onError} />
    </ComponentErrorBoundary>
  );
}

export { SafeSheetMusicDisplay as SheetMusicDisplay };
```

---

## Migration Guide

### How to Update Existing Code

Follow this checklist to migrate existing code to use the new error handling patterns:

#### Step 1: Replace `console.error` with `logError`

**Before:**

```typescript
try {
	await fetchData();
} catch (error) {
	console.error(error);
}
```

**After:**

```typescript
import { logError } from "@/shared/utils/error.utils";

try {
	await fetchData();
} catch (error) {
	logError(error, "ComponentName.fetchData");
}
```

#### Step 2: Use `useErrorState` for Inline Errors

**Before:**

```typescript
const [error, setError] = useState<string>('');

try {
  await api.submitForm(data);
} catch (err) {
  setError(err.message);
}

return <div>{error && <div className="error">{error}</div>}</div>;
```

**After:**

```typescript
import { useErrorState } from '@/shared/hooks/useErrorState';

const { errorMessage, setError, clearError } = useErrorState();

try {
  await api.submitForm(data);
} catch (err) {
  logError(err, 'ComponentName.submitForm');
  setError(err);
}

return (
  <div>
    {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
  </div>
);
```

#### Step 3: Replace Manual Try/Catch with `useAsyncHandler`

**Before:**

```typescript
const [isLoading, setIsLoading] = useState(false);

const handleSave = async () => {
	setIsLoading(true);
	try {
		await api.save(data);
		alert("Saved!");
	} catch (error) {
		console.error(error);
		alert("Error saving");
	} finally {
		setIsLoading(false);
	}
};
```

**After:**

```typescript
import { useAsyncHandler } from "@/shared/hooks/useAsyncHandler";

const { execute, isLoading } = useAsyncHandler();

const handleSave = async () => {
	await execute(() => api.save(data), {
		context: "ComponentName.handleSave",
		onSuccess: () => showToast("Saved!", "success"),
		showToast: true,
	});
};
```

#### Step 4: Add Error Boundaries to Third-Party Components

**Before:**

```typescript
<OpenSheetMusicDisplay xml={musicXml} />
```

**After:**

```typescript
import { ComponentErrorBoundary } from '@/shared/components/ComponentErrorBoundary';

<ComponentErrorBoundary
  fallback={<div>Failed to render sheet music</div>}
>
  <OpenSheetMusicDisplay xml={musicXml} />
</ComponentErrorBoundary>
```

#### Step 5: Use Type Guards for Error Handling

**Before:**

```typescript
try {
	await api.login(credentials);
} catch (error) {
	if (error.response?.status === 401) {
		navigate("/login");
	}
}
```

**After:**

```typescript
import { isAuthError } from "@/shared/utils/error.utils";

try {
	await api.login(credentials);
} catch (error) {
	if (isAuthError(error)) {
		navigate("/login");
	}
}
```

---

### Developer Checklist

Use this checklist when implementing new features or refactoring existing code:

- [ ] Replace all `console.error` calls with `logError(error, context)`
- [ ] Use `useErrorState` for components that need inline error display
- [ ] Use `useAsyncHandler` for background operations and toast notifications
- [ ] Add `ComponentErrorBoundary` around third-party components
- [ ] Use type guards (`isApiError`, `isNetworkError`, etc.) for conditional error handling
- [ ] Throw custom errors (`NetworkError`, `ValidationError`, etc.) when appropriate
- [ ] Display validation errors inline (not in toasts)
- [ ] Show background operation results in toasts
- [ ] Include context strings in all `logError` calls
- [ ] Clear errors when retrying operations
- [ ] Test error handling paths (network errors, validation errors, etc.)
- [ ] Provide user-friendly error messages
- [ ] Add error recovery options (retry, reload, go home)

---

## Summary

This error handling system provides:

✅ **Consistency** - Standardized patterns across the entire application  
✅ **Developer Experience** - Less boilerplate, better debugging  
✅ **User Experience** - Clear messages, graceful degradation, recovery options  
✅ **Type Safety** - TypeScript integration for compile-time error checking  
✅ **Production Ready** - Built-in support for error tracking services

**Key Takeaways:**

1. Always use `logError()` instead of `console.error`
2. Use `useErrorState` for inline errors
3. Use `useAsyncHandler` for background operations
4. Wrap third-party components with `ComponentErrorBoundary`
5. Use toast notifications for non-blocking errors
6. Use inline errors for form validation and required user input
7. Provide context strings for all error logs
8. Test error handling paths thoroughly

---

**Questions or Issues?**  
If you encounter any issues with the error handling system or have suggestions for improvements, please create an issue in the repository.

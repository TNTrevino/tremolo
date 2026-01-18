# Shared Resources

This directory contains code that is shared across multiple features.

## Directory Structure

### components/
Reusable UI components that are used across multiple features:
- **ui/** - Base UI components (Button, Input, Card, Label, Select, Toast, etc.) from shadcn/ui
- **forms/** - Reusable form components and form-related utilities
- **layout/** - Layout components (Navigation, ProtectedRoute, Footer, etc.)
- **ErrorBoundary.tsx** - Error boundary component for catching and handling React errors

### hooks/
Custom React hooks that can be used across multiple features:
- **useToast** - Hook for displaying toast notifications (success, error, warning, info)

### utils/
Utility functions and helpers used throughout the application:
- **error.utils.ts** - Error handling utilities (getErrorMessage, logError, error type checks)

### types/
Shared TypeScript types, interfaces, and type utilities

## Usage

Import shared resources using absolute paths:
```typescript
import { Button } from '@/shared/components/ui/button';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useToast } from '@/shared/hooks/useToast';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { getErrorMessage, logError } from '@/shared/utils/error.utils';
```

## Error Handling System

The application includes a comprehensive error handling system:

### 1. Error Boundary Component
Catches React component errors and displays a user-friendly fallback UI:

```typescript
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

Features:
- Catches and logs component errors
- Displays user-friendly error UI
- Provides retry, reload, and go home actions
- Shows stack traces in development mode
- Supports custom fallback UI

### 2. Toast Notification System
Display user-facing notifications for errors, success messages, warnings, and info:

```typescript
import { useToast } from '@/shared/hooks/useToast';

function MyComponent() {
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  
  const handleAction = async () => {
    try {
      await someApiCall();
      showSuccess('Action completed successfully!');
    } catch (error) {
      showError(getErrorMessage(error), 'Action Failed');
    }
  };
}
```

### 3. Error Utility Functions
Helper functions for consistent error handling:

```typescript
import { 
  getErrorMessage,      // Extract user-friendly message from any error
  logError,             // Log errors with context
  isApiError,           // Check if error is from API
  isNetworkError,       // Check if error is network-related
  isAuthError,          // Check if error is 401/403
  isValidationError,    // Check if error is 400/422
  hasStatusCode         // Check for specific HTTP status
} from '@/shared/utils/error.utils';

try {
  await apiCall();
} catch (error) {
  logError(error, 'MyComponent.apiCall');
  
  if (isAuthError(error)) {
    navigate('/login');
  } else {
    showError(getErrorMessage(error));
  }
}
```

### 4. Implementation in App.tsx
Error boundaries and toast provider are set up at the app level:
- Outer ErrorBoundary catches app-level errors
- ToastProvider makes toast notifications available app-wide
- Inner ErrorBoundary around Routes catches routing errors
- ToastContainerWrapper displays toast notifications

For detailed examples and best practices, see:
- `/src/shared/utils/error-handling-examples.md`

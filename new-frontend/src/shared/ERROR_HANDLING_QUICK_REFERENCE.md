# Error Handling Quick Reference

Quick reference guide for using the error handling system in Tremolo.

## Common Imports

```typescript
// Error utilities
import { getErrorMessage, logError, isApiError, isAuthError } from '@/shared/utils/error.utils';

// Toast notifications
import { useToast } from '@/shared/hooks/useToast';

// Error boundary
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
```

---

## Toast Notifications

### Basic Usage

```typescript
const { showSuccess, showError, showWarning, showInfo } = useToast();

// Success message
showSuccess('Profile updated successfully!');
showSuccess('Data saved!', 'Success');

// Error message
showError('Failed to save data');
showError(getErrorMessage(error), 'Save Failed');

// Warning message
showWarning('This action cannot be undone');

// Info message
showInfo('New features available');
```

### Custom Duration

```typescript
const { showToast } = useToast();

// Show for 10 seconds (default is 5 seconds)
showToast('Message', 'info', 'Title', 10000);

// Never auto-dismiss (set duration to 0)
showToast('Important message', 'warning', 'Warning', 0);
```

---

## Error Utilities

### Extract Error Message

```typescript
try {
  await apiCall();
} catch (error) {
  const message = getErrorMessage(error);
  showError(message);
}
```

### Log Errors with Context

```typescript
try {
  await updateUser(data);
} catch (error) {
  logError(error, 'UserProfile.updateUser');
  showError(getErrorMessage(error));
}
```

### Check Error Types

```typescript
try {
  await apiCall();
} catch (error) {
  if (isAuthError(error)) {
    // 401/403 error - redirect to login
    navigate('/login');
  } else if (isNetworkError(error)) {
    // Network error - show retry
    showError('Please check your connection');
  } else if (isValidationError(error)) {
    // 400/422 - validation error
    showError('Please check your input');
  } else if (hasStatusCode(error, 429)) {
    // Rate limit
    showError('Too many requests');
  }
}
```

---

## Error Boundary

### Wrap Components

```typescript
<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>
```

### Custom Fallback

```typescript
<ErrorBoundary fallback={<div>Custom error message</div>}>
  <MyComponent />
</ErrorBoundary>
```

### With Error Callback

```typescript
<ErrorBoundary onError={(error, errorInfo) => {
  analytics.track('component_error', { error, errorInfo });
}}>
  <MyComponent />
</ErrorBoundary>
```

### Higher-Order Component

```typescript
import { withErrorBoundary } from '@/shared/components/ErrorBoundary';

function MyComponent() {
  return <div>Content</div>;
}

export default withErrorBoundary(MyComponent);
```

---

## React Query Error Handling

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

// Query with error handling
const { data, isError, error } = useQuery({
  queryKey: ['user'],
  queryFn: fetchUser,
  onError: (error) => {
    logError(error, 'useUserQuery');
    showError(getErrorMessage(error), 'Failed to load user');
  },
});

// Mutation with error handling
const mutation = useMutation({
  mutationFn: updateUser,
  onSuccess: () => {
    showSuccess('User updated!');
  },
  onError: (error) => {
    logError(error, 'updateUser');
    showError(getErrorMessage(error), 'Update failed');
  },
});
```

---

## Form Error Handling

```typescript
const { showError, showSuccess } = useToast();

const handleSubmit = async (formData) => {
  try {
    await submitForm(formData);
    showSuccess('Form submitted successfully!');
  } catch (error) {
    logError(error, 'FormComponent.handleSubmit');

    if (isValidationError(error)) {
      // Handle field errors
      showError('Please check the form for errors', 'Validation Error');
    } else {
      showError(getErrorMessage(error), 'Submit Failed');
    }
  }
};
```

---

## Complete Example

```typescript
import { useToast } from '@/shared/hooks/useToast';
import { getErrorMessage, logError, isAuthError } from '@/shared/utils/error.utils';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';

function UserProfile() {
  const { showSuccess, showError } = useToast();

  const handleUpdate = async (data) => {
    try {
      await userService.update(data);
      showSuccess('Profile updated successfully!');
    } catch (error) {
      logError(error, 'UserProfile.handleUpdate');

      if (isAuthError(error)) {
        showError('Please log in again', 'Session Expired');
        navigate('/login');
      } else {
        showError(getErrorMessage(error), 'Update Failed');
      }
    }
  };

  return (
    <ErrorBoundary>
      <form onSubmit={handleUpdate}>
        {/* form fields */}
      </form>
    </ErrorBoundary>
  );
}
```

---

## Testing

### Use ErrorTester Component

```typescript
import { ErrorTester } from '@/shared/components/ErrorTester';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';

export function TestPage() {
  return (
    <ErrorBoundary>
      <ErrorTester />
    </ErrorBoundary>
  );
}
```

### Test in Browser Console

```javascript
// Trigger error boundary
throw new Error('Test error');

// Test toast from console (if you expose it)
window.showTestToast = () => {
  const event = new CustomEvent('showToast', {
    detail: { message: 'Test', type: 'info' },
  });
  window.dispatchEvent(event);
};
```

---

## Checklist for New Features

- [ ] Wrap API calls in try/catch
- [ ] Log errors with `logError(error, 'Context')`
- [ ] Show user-friendly messages with toast
- [ ] Add error boundaries around complex components
- [ ] Handle specific error types (auth, network, validation)
- [ ] Test error scenarios

---

## More Information

- **Detailed Examples:** `/src/shared/utils/error-handling-examples.md`
- **Full Documentation:** `/ERROR_HANDLING_SUMMARY.md`
- **Source Code:**
  - Error Utils: `/src/shared/utils/error.utils.ts`
  - Error Boundary: `/src/shared/components/ErrorBoundary.tsx`
  - Toast Hook: `/src/shared/hooks/useToast.tsx`
  - Toast UI: `/src/shared/components/ui/toast.tsx`

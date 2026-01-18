# Form Components

This directory contains reusable form components that integrate with React Hook Form and Zod validation.

## Components

### FormField

A wrapper component that combines label, input/select, and error display.

```tsx
<FormField
  label="Email"
  error={errors.email?.message}
  required
  htmlFor="email"
>
  <FormInput id="email" {...register('email')} />
</FormField>
```

**Props:**
- `label` - Label text
- `error` - Error message to display
- `required` - Shows red asterisk if true
- `children` - Form input component
- `className` - Additional CSS classes
- `htmlFor` - Links label to input (should match input id)

### FormInput

Input component integrated with react-hook-form.

```tsx
<FormInput
  id="email"
  type="email"
  placeholder="Enter email"
  {...register('email')}
  error={errors.email?.message}
/>
```

**Props:**
- All standard HTML input props
- `registration` - React Hook Form registration object
- `error` - Error message to display

### FormSelect

Select component integrated with react-hook-form.

```tsx
<FormSelect id="role" {...register('role')} error={errors.role?.message}>
  <option value="student">Student</option>
  <option value="teacher">Teacher</option>
</FormSelect>
```

**Props:**
- All standard HTML select props
- `registration` - React Hook Form registration object
- `error` - Error message to display

### FormLabel

Label component with optional required indicator.

```tsx
<FormLabel htmlFor="email" required>
  Email Address
</FormLabel>
```

**Props:**
- All standard HTML label props
- `required` - Shows red asterisk if true

### FormError

Error message display component.

```tsx
<FormError>{errors.email?.message}</FormError>
```

**Props:**
- `children` - Error message to display
- All standard HTML paragraph props

## Usage Pattern

1. Import the custom hook and components:

```tsx
import { useForm } from '@/shared/hooks/useForm';
import { FormField, FormInput, FormSelect } from '@/shared/components/forms';
```

2. Import your validation schema:

```tsx
import { loginSchema, LoginFormData } from '@/features/auth/validation/schemas';
```

3. Set up the form:

```tsx
function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    schema: loginSchema,
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    // Handle form submission
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormField label="Email" error={errors.email?.message} required>
        <FormInput type="email" {...register('email')} />
      </FormField>
      
      <button type="submit" disabled={isSubmitting}>
        Login
      </button>
    </form>
  );
}
```

## See Also

- `/src/features/auth/validation/schemas.ts` - Validation schemas
- `/src/features/auth/validation/example-usage.tsx` - Complete examples
- `/src/shared/hooks/useForm.ts` - Custom form hook

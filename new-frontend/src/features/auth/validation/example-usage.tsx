/**
 * EXAMPLE: How to use React Hook Form with Zod validation
 * 
 * This file demonstrates the usage patterns for the form infrastructure.
 * Delete this file once you've reviewed the examples.
 */

import { useForm } from '@/shared/hooks/useForm';
import { FormField, FormInput, FormSelect } from '@/shared/components/forms';
import { Button } from '@/shared/components/ui/button';
import type { LoginFormData, SignupFormData } from './schemas';
import { loginSchema, signupSchema } from './schemas';

// ============================================================================
// EXAMPLE 1: Login Form
// ============================================================================
export function LoginFormExample() {
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
    console.log('Login data:', data);
    // Call your login API here
    // await authService.login(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        label="Email"
        error={errors.email?.message}
        required
        htmlFor="email"
      >
        <FormInput
          id="email"
          type="email"
          placeholder="Enter your email"
          {...register('email')}
        />
      </FormField>

      <FormField
        label="Password"
        error={errors.password?.message}
        required
        htmlFor="password"
      >
        <FormInput
          id="password"
          type="password"
          placeholder="Enter your password"
          {...register('password')}
        />
      </FormField>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Logging in...' : 'Login'}
      </Button>
    </form>
  );
}

// ============================================================================
// EXAMPLE 2: Signup Form
// ============================================================================
export function SignupFormExample() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<SignupFormData>({
    schema: signupSchema,
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'student',
    },
  });

  const onSubmit = async (data: SignupFormData) => {
    console.log('Signup data:', data);
    // Call your signup API here
    // await authService.signup(data);
  };

  const password = watch('password');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          label="First Name"
          error={errors.firstName?.message}
          required
          htmlFor="firstName"
        >
          <FormInput
            id="firstName"
            placeholder="John"
            {...register('firstName')}
          />
        </FormField>

        <FormField
          label="Last Name"
          error={errors.lastName?.message}
          required
          htmlFor="lastName"
        >
          <FormInput
            id="lastName"
            placeholder="Doe"
            {...register('lastName')}
          />
        </FormField>
      </div>

      <FormField
        label="Email"
        error={errors.email?.message}
        required
        htmlFor="email"
      >
        <FormInput
          id="email"
          type="email"
          placeholder="john.doe@example.com"
          {...register('email')}
        />
      </FormField>

      <FormField
        label="Password"
        error={errors.password?.message}
        required
        htmlFor="password"
      >
        <FormInput
          id="password"
          type="password"
          placeholder="Enter password"
          {...register('password')}
        />
      </FormField>

      {password && (
        <div className="text-xs space-y-1 p-3 bg-muted rounded-md">
          <p className="font-medium">Password requirements:</p>
          <ul className="space-y-0.5 ml-4 list-disc">
            <li className={password.length >= 8 ? 'text-green-600' : 'text-muted-foreground'}>
              At least 8 characters
            </li>
            <li className={/[A-Z]/.test(password) ? 'text-green-600' : 'text-muted-foreground'}>
              One uppercase letter
            </li>
            <li className={/[a-z]/.test(password) ? 'text-green-600' : 'text-muted-foreground'}>
              One lowercase letter
            </li>
            <li className={/\d/.test(password) ? 'text-green-600' : 'text-muted-foreground'}>
              One number
            </li>
            <li className={/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'text-green-600' : 'text-muted-foreground'}>
              One special character
            </li>
          </ul>
        </div>
      )}

      <FormField
        label="Confirm Password"
        error={errors.confirmPassword?.message}
        required
        htmlFor="confirmPassword"
      >
        <FormInput
          id="confirmPassword"
          type="password"
          placeholder="Confirm password"
          {...register('confirmPassword')}
        />
      </FormField>

      <FormField
        label="I am a..."
        error={errors.role?.message}
        required
        htmlFor="role"
      >
        <FormSelect id="role" {...register('role')}>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="parent">Parent</option>
        </FormSelect>
      </FormField>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Creating account...' : 'Sign Up'}
      </Button>
    </form>
  );
}

// ============================================================================
// USAGE NOTES
// ============================================================================

/**
 * Key Features:
 * 
 * 1. Automatic Validation: Zod schemas validate on submit and on blur
 * 2. Type Safety: Full TypeScript support with inferred types
 * 3. Error Handling: Errors automatically displayed in FormField
 * 4. Registration: Use {...register('fieldName')} to connect fields
 * 5. Form State: Access isSubmitting, isDirty, isValid, etc.
 * 6. Watch Fields: Use watch('fieldName') to react to field changes
 * 
 * Common Patterns:
 * 
 * - Set default values in useForm options
 * - Use formState.errors to access validation errors
 * - Use handleSubmit to wrap your submit handler
 * - Use watch() to create dependent UI (like password strength)
 * - Use reset() to clear form after successful submission
 * - Use setValue() to programmatically set field values
 * 
 * Best Practices:
 * 
 * - Always provide htmlFor on FormField matching input id
 * - Use required prop on FormField to show asterisk
 * - Keep validation logic in Zod schemas, not components
 * - Extract common validation patterns to reusable schemas
 * - Use TypeScript types inferred from schemas
 */

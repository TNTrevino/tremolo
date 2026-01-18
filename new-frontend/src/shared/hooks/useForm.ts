import type { UseFormProps, UseFormReturn, FieldValues } from 'react-hook-form';
import { useForm as useHookForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodType } from 'zod';

export interface UseFormOptions<T extends FieldValues> extends Omit<UseFormProps<T>, 'resolver'> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: ZodType<T, any, any>;
}

/**
 * Custom wrapper around react-hook-form that integrates Zod validation.
 *
 * @example
 * ```tsx
 * import { useForm } from '@/shared/hooks/useForm';
 * import { loginSchema, LoginFormData } from '@/features/auth/validation/schemas';
 *
 * function LoginForm() {
 *   const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
 *     schema: loginSchema,
 *     defaultValues: {
 *       email: '',
 *       password: '',
 *     },
 *   });
 *
 *   const onSubmit = (data: LoginFormData) => {
 *     console.log(data);
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit(onSubmit)}>
 *       <FormField label="Email" error={errors.email?.message}>
 *         <FormInput {...register('email')} />
 *       </FormField>
 *       <FormField label="Password" error={errors.password?.message}>
 *         <FormInput type="password" {...register('password')} />
 *       </FormField>
 *       <button type="submit">Login</button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useForm<T extends FieldValues>({
  schema,
  ...options
}: UseFormOptions<T>): UseFormReturn<T> {
  return useHookForm<T>({
    ...options,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
  });
}

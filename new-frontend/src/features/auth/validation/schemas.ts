import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z
  .object({
    firstName: z
      .string()
      .min(2, 'At least 2 characters')
      .regex(/^[a-zA-Z]+$/, 'Only letters'),
    lastName: z
      .string()
      .min(2, 'At least 2 characters')
      .regex(/^[a-zA-Z]+$/, 'Only letters'),
    email: z.string().email('Invalid email format'),
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Contains uppercase letter')
      .regex(/[a-z]/, 'Contains lowercase letter')
      .regex(/\d/, 'Contains number')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Contains special character'),
    confirmPassword: z.string(),
    role: z.enum(['student', 'teacher', 'parent']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;

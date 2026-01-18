import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/shared/components/forms/FormField';
import { FormInput } from '@/shared/components/forms/FormInput';
import { loginSchema, type LoginFormData } from '@/features/auth/validation/schemas';
import { useLogin } from '@/shared/hooks/queries/useAuthQuery';
import type { LoginLocationState } from '@/shared/types';
import type { ApiError } from '@/services/api/types';

export interface LoginPageProps {}

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const loginMutation = useLogin();

  const locationState = location.state as LoginLocationState | null;
  const successMessage = locationState?.successMessage;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await loginMutation.mutateAsync(data);
      const from = locationState?.from?.pathname ?? '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      const apiError = err as ApiError;
      setError('root', {
        message: apiError.message || 'Invalid email or password',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-lg bg-primary p-3">
              <Music className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Welcome to Tremolo</CardTitle>
          <CardDescription className="text-base">
            Sign in to continue your musical journey
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {successMessage && (
              <div className="p-3 rounded-md bg-primary/10 border-2 border-primary text-sm font-medium">
                {successMessage}
              </div>
            )}

            {errors.root && (
              <div className="p-3 rounded-md bg-destructive/10 border-2 border-destructive text-destructive text-sm font-medium">
                {errors.root.message}
              </div>
            )}

            <FormField label="Email Address" error={errors.email?.message} htmlFor="email">
              <FormInput
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                {...register('email')}
                error={errors.email?.message}
              />
            </FormField>

            <FormField label="Password" error={errors.password?.message} htmlFor="password">
              <div className="relative">
                <FormInput
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pr-10"
                  {...register('password')}
                  error={errors.password?.message}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </FormField>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" size="lg" loading={loginMutation.isPending}>
              Sign In
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link to="/signup" className="text-primary font-medium hover:underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

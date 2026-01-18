import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';

// Types (will be replaced with actual API service types later)
interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'teacher' | 'parent';
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'teacher' | 'parent';
}

interface LoginResponse {
  user: User;
  token: string;
}

interface RegisterResponse {
  user: User;
  token: string;
}

// Query Keys
export const authKeys = {
  all: ['auth'] as const,
  currentUser: () => [...authKeys.all, 'current-user'] as const,
  login: () => [...authKeys.all, 'login'] as const,
  register: () => [...authKeys.all, 'register'] as const,
};

/**
 * Hook to get current user information
 * Only runs if user is authenticated
 */
export function useCurrentUser() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: authKeys.currentUser(),
    queryFn: async (): Promise<User> => {
      if (!token) {
        throw new Error('No authentication token found');
      }

      // TODO: Replace with actual API call
      // const response = await authApi.getCurrentUser();
      // return response.data;

      // Placeholder for now
      throw new Error('API service not yet implemented');
    },
    enabled: !!token,
  });
}

/**
 * Hook to handle user login
 */
export function useLogin() {
  const queryClient = useQueryClient();
  const { setUser, setToken } = useAuthStore();

  return useMutation({
    mutationFn: async (_credentials: LoginRequest): Promise<LoginResponse> => {
      // TODO: Replace with actual API call
      // const response = await authApi.login(_credentials);
      // return response.data;

      // Placeholder for now
      throw new Error('API service not yet implemented');
    },
    onSuccess: (data) => {
      setUser(data.user);
      setToken(data.token);
      queryClient.setQueryData(authKeys.currentUser(), data.user);
    },
  });
}

/**
 * Hook to handle user registration
 */
export function useRegister() {
  const queryClient = useQueryClient();
  const { setUser, setToken } = useAuthStore();

  return useMutation({
    mutationFn: async (_userData: RegisterRequest): Promise<RegisterResponse> => {
      // TODO: Replace with actual API call
      // const response = await authApi.register(_userData);
      // return response.data;

      // Placeholder for now
      throw new Error('API service not yet implemented');
    },
    onSuccess: (data) => {
      setUser(data.user);
      setToken(data.token);
      queryClient.setQueryData(authKeys.currentUser(), data.user);
    },
  });
}

/**
 * Hook to handle user logout
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      // TODO: Add API call to invalidate refresh token on server if needed
      // await authApi.logout();
    },
    onSuccess: () => {
      logout();
      queryClient.clear();
    },
  });
}

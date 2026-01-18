import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';

// Types (will be replaced with actual API service types later)
interface GeneralUserInfo {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  joinDate: string;
  totalGamesPlayed: number;
  averageAccuracy: number;
}

interface UserStats {
  totalGamesPlayed: number;
  averageAccuracy: number;
  bestStreak: number;
  recentActivity: Array<{
    date: string;
    gamesPlayed: number;
    accuracy: number;
  }>;
}

// Query Keys
export const userKeys = {
  all: ['user'] as const,
  generalInfo: (userId: string) => [...userKeys.all, 'general-info', userId] as const,
  stats: (userId: string) => [...userKeys.all, 'stats', userId] as const,
};

/**
 * Hook to fetch general user information
 * Includes join date and overall statistics
 */
export function useGeneralUserInfo(userId?: string) {
  const token = useAuthStore((state) => state.token);
  const currentUser = useAuthStore((state) => state.user);
  const targetUserId = userId || currentUser?.id;

  return useQuery({
    queryKey: userKeys.generalInfo(targetUserId || 'unknown'),
    queryFn: async (): Promise<GeneralUserInfo> => {
      if (!token || !targetUserId) {
        throw new Error('Authentication required');
      }

      // TODO: Replace with actual API call
      // const response = await userApi.getGeneralInfo(targetUserId);
      // return response.data;

      // Placeholder for now
      throw new Error('API service not yet implemented');
    },
    enabled: !!token && !!targetUserId,
  });
}

/**
 * Hook to fetch detailed user statistics
 * Includes performance metrics and recent activity
 */
export function useUserStats(userId?: string) {
  const token = useAuthStore((state) => state.token);
  const currentUser = useAuthStore((state) => state.user);
  const targetUserId = userId || currentUser?.id;

  return useQuery({
    queryKey: userKeys.stats(targetUserId || 'unknown'),
    queryFn: async (): Promise<UserStats> => {
      if (!token || !targetUserId) {
        throw new Error('Authentication required');
      }

      // TODO: Replace with actual API call
      // const response = await userApi.getStats(targetUserId);
      // return response.data;

      // Placeholder for now
      throw new Error('API service not yet implemented');
    },
    enabled: !!token && !!targetUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes - stats don't change as frequently
  });
}

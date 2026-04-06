import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth.store";
import { userService } from "@/services/api";
import { mapGeneralUserInfo } from "@/services/api/mappers/user.mapper";
import type {
	UserProfile,
	MultiMetricChartData,
	ChartQueryParams,
	SaveGameResultParams,
	CreateNoteGameEntryResponse,
	NoteGameSettingsResponse,
	NoteGameSettingsRequest,
	KeyboardBindingsResponse,
	KeyboardBindingsRequest,
	NoteGameEntry,
	DailyActivityCount,
} from "@/services/api/types";

export const userKeys = {
	all: ["user"] as const,
	profile: (userId: number) => [...userKeys.all, "profile", userId] as const,
	stats: (userId: number, params?: ChartQueryParams) =>
		[...userKeys.all, "stats", userId, params] as const,
	recentGames: () => [...userKeys.all, "recent-games"] as const,
	classMetrics: (params?: ChartQueryParams) =>
		[...userKeys.all, "class-metrics", params] as const,
	activity: () => [...userKeys.all, "activity"] as const,
	noteGameSettings: () => [...userKeys.all, "note-game-settings"] as const,
	keyboardBindings: () => [...userKeys.all, "keyboard-bindings"] as const,
};

/**
 * Fetch the general profile info for a user.
 */
export function useUserProfile(userId?: number) {
	const authUser = useAuthStore((state) => state.user);
	const targetId = userId ?? authUser?.id;

	return useQuery<UserProfile>({
		queryKey: userKeys.profile(targetId!),
		queryFn: async () => {
			const raw = await userService.getProfile(targetId!);
			return mapGeneralUserInfo(raw);
		},
		enabled: !!targetId,
		staleTime: 5 * 60 * 1000,
	});
}

/**
 * Fetch performance chart data for a user.
 */
export function useUserStats(userId?: number, params?: ChartQueryParams) {
	const authUser = useAuthStore((state) => state.user);
	const targetId = userId ?? authUser?.id;

	return useQuery<MultiMetricChartData>({
		queryKey: userKeys.stats(targetId!, params),
		queryFn: () => userService.getStats(targetId!, params),
		enabled: !!targetId,
		staleTime: 2 * 60 * 1000,
	});
}

/**
 * Fetch the authenticated user's most recent note-game entries (up to 30).
 * Returns newest-first; callers should reverse if they need oldest-first.
 */
export function useRecentGameEntries() {
	const authUser = useAuthStore((state) => state.user);

	return useQuery<NoteGameEntry[]>({
		queryKey: userKeys.recentGames(),
		queryFn: () => userService.getRecentGameEntries(),
		enabled: !!authUser?.id,
		staleTime: 60 * 1000,
	});
}

/**
 * Fetch daily game counts for the activity heatmap (last ~1 year).
 */
export function useActivityHeatmap() {
	const authUser = useAuthStore((state) => state.user);

	return useQuery<DailyActivityCount[]>({
		queryKey: userKeys.activity(),
		queryFn: () => userService.getActivityHeatmap(),
		enabled: !!authUser?.id,
		staleTime: 5 * 60 * 1000,
	});
}

/**
 * Fetch aggregated class metrics for teachers.
 */
export function useClassMetrics(params?: ChartQueryParams) {
	const authUser = useAuthStore((state) => state.user);
	const isTeacher = authUser?.role === "TEACHER";

	return useQuery<MultiMetricChartData>({
		queryKey: userKeys.classMetrics(params),
		queryFn: () => userService.getClassMetrics(params),
		enabled: !!authUser?.id && isTeacher,
		staleTime: 5 * 60 * 1000,
	});
}

/**
 * Mutation to save a completed note-game result to the backend.
 * Automatically invalidates recent-games and user stats caches on success.
 */
export function useSaveGameResult() {
	const queryClient = useQueryClient();

	return useMutation<CreateNoteGameEntryResponse, Error, SaveGameResultParams>({
		mutationFn: (entry) => userService.saveGameResult(entry),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: userKeys.recentGames() });
			queryClient.invalidateQueries({ queryKey: userKeys.activity() });
			queryClient.invalidateQueries({
				queryKey: userKeys.all,
				predicate: (query) => query.queryKey[1] === "stats",
			});
			queryClient.invalidateQueries({
				queryKey: [...userKeys.all, "profile"],
			});
		},
	});
}

export function useNoteGameSettings() {
	const authUser = useAuthStore((state) => state.user);

	return useQuery<NoteGameSettingsResponse | null>({
		queryKey: userKeys.noteGameSettings(),
		queryFn: () => userService.getNoteGameSettings(),
		enabled: !!authUser?.id,
		staleTime: 10 * 60 * 1000,
	});
}

export function useSaveNoteGameSettings() {
	const queryClient = useQueryClient();

	return useMutation<NoteGameSettingsResponse, Error, NoteGameSettingsRequest>({
		mutationFn: (settings) => userService.saveNoteGameSettings(settings),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: userKeys.noteGameSettings(),
			});
		},
	});
}

export function useKeyboardBindings() {
	const authUser = useAuthStore((state) => state.user);

	return useQuery<KeyboardBindingsResponse | null>({
		queryKey: userKeys.keyboardBindings(),
		queryFn: () => userService.getKeyboardBindings(),
		enabled: !!authUser?.id,
		staleTime: 10 * 60 * 1000,
	});
}

export function useSaveKeyboardBindings() {
	const queryClient = useQueryClient();

	return useMutation<KeyboardBindingsResponse, Error, KeyboardBindingsRequest>({
		mutationFn: (bindings) => userService.saveKeyboardBindings(bindings),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: userKeys.keyboardBindings(),
			});
		},
	});
}

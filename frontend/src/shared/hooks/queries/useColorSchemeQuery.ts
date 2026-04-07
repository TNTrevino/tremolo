import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth.store";
import { colorSchemeService } from "@/services/api";
import type {
	ColorSchemeResponse,
	CreateColorSchemeRequest,
	UpdateColorSchemeRequest,
	SetActiveSchemeRequest,
	SetPreferredSchemesRequest,
} from "@/services/api/types";

export const colorSchemeKeys = {
	all: ["colorScheme"] as const,
	list: () => [...colorSchemeKeys.all, "list"] as const,
	active: () => [...colorSchemeKeys.all, "active"] as const,
};

/**
 * Fetch all color schemes for the authenticated user.
 */
export function useColorSchemes() {
	const authUser = useAuthStore((state) => state.user);

	return useQuery<ColorSchemeResponse[]>({
		queryKey: colorSchemeKeys.list(),
		meta: { errorTitle: "Failed to load color schemes" },
		queryFn: () => colorSchemeService.getColorSchemes(),
		enabled: !!authUser?.id,
		staleTime: 5 * 60 * 1000,
	});
}

/**
 * Fetch the active color scheme for the authenticated user.
 * Components consuming this hook are responsible for syncing the
 * returned data to the colorScheme Zustand store if needed.
 */
export function useActiveColorScheme() {
	const authUser = useAuthStore((state) => state.user);

	return useQuery<ColorSchemeResponse | null>({
		queryKey: colorSchemeKeys.active(),
		meta: { errorTitle: "Failed to load active color scheme" },
		queryFn: () => colorSchemeService.getActiveColorScheme(),
		enabled: !!authUser?.id,
		staleTime: 5 * 60 * 1000,
	});
}

/**
 * Create a new color scheme.
 * Invalidates the list cache on success.
 */
export function useCreateColorScheme() {
	const queryClient = useQueryClient();

	return useMutation<ColorSchemeResponse, Error, CreateColorSchemeRequest>({
		mutationFn: (req) => colorSchemeService.createColorScheme(req),
		meta: { errorTitle: "Failed to create color scheme" },
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: colorSchemeKeys.list() });
		},
	});
}

/**
 * Update an existing color scheme.
 * Invalidates both the list and active caches on success.
 */
export function useUpdateColorScheme() {
	const queryClient = useQueryClient();

	return useMutation<
		ColorSchemeResponse,
		Error,
		{ id: number; req: UpdateColorSchemeRequest }
	>({
		mutationFn: ({ id, req }) => colorSchemeService.updateColorScheme(id, req),
		meta: { errorTitle: "Failed to update color scheme" },
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: colorSchemeKeys.list() });
			queryClient.invalidateQueries({ queryKey: colorSchemeKeys.active() });
		},
	});
}

/**
 * Delete a color scheme by id.
 * Invalidates the list cache on success.
 */
export function useDeleteColorScheme() {
	const queryClient = useQueryClient();

	return useMutation<void, Error, number>({
		mutationFn: (id) => colorSchemeService.deleteColorScheme(id),
		meta: { errorTitle: "Failed to delete color scheme" },
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: colorSchemeKeys.list() });
		},
	});
}

/**
 * Set the active color scheme (light or dark slot).
 * Invalidates active and list caches on success.
 */
export function useSetActiveScheme() {
	const queryClient = useQueryClient();

	return useMutation<void, Error, SetActiveSchemeRequest>({
		mutationFn: (req) => colorSchemeService.setActiveScheme(req),
		meta: { errorTitle: "Failed to set active scheme" },
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: colorSchemeKeys.active() });
			queryClient.invalidateQueries({ queryKey: colorSchemeKeys.list() });
		},
	});
}

/**
 * Toggle between the user's preferred light/dark schemes.
 * Returns the newly active scheme; invalidates the active cache on success.
 */
export function useToggleScheme() {
	const queryClient = useQueryClient();

	return useMutation<ColorSchemeResponse, Error, void>({
		mutationFn: () => colorSchemeService.toggleScheme(),
		meta: { errorTitle: "Failed to toggle color scheme" },
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: colorSchemeKeys.active() });
		},
	});
}

/**
 * Set the user's preferred light and dark scheme ids.
 * Invalidates the list cache on success.
 */
export function useSetPreferredSchemes() {
	const queryClient = useQueryClient();

	return useMutation<void, Error, SetPreferredSchemesRequest>({
		mutationFn: (req) => colorSchemeService.setPreferredSchemes(req),
		meta: { errorTitle: "Failed to save scheme preferences" },
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: colorSchemeKeys.list() });
		},
	});
}

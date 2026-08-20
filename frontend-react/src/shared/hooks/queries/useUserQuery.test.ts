import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useKeyboardBindings, useSaveKeyboardBindings } from "./useUserQuery";
import { userService } from "@/services/api";
import type {
	KeyboardBindingsResponse,
	KeyboardBindingsRequest,
} from "@/services/api/types";

vi.mock("@/services/api", () => ({
	userService: {
		getKeyboardBindings: vi.fn(),
		saveKeyboardBindings: vi.fn(),
	},
}));

const mockUseAuthStore = vi.fn();
vi.mock("@/stores/auth.store", () => ({
	useAuthStore: (selector: (state: unknown) => unknown) =>
		selector(mockUseAuthStore()),
}));

const mockGetKeyboardBindings = userService.getKeyboardBindings as Mock;
const mockSaveKeyboardBindings = userService.saveKeyboardBindings as Mock;

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	function Wrapper({ children }: { children: React.ReactNode }) {
		return React.createElement(
			QueryClientProvider,
			{ client: queryClient },
			children,
		);
	}
	return Wrapper;
}

const fakeBindings: KeyboardBindingsResponse = {
	id: 1,
	user_id: 42,
	key_bindings: {
		key_c: "a",
		key_c_sharp: "q",
		key_c_flat: "z",
		key_d: "s",
		key_d_sharp: "w",
		key_d_flat: "x",
		key_e: "d",
		key_e_sharp: "e",
		key_e_flat: "c",
		key_f: "f",
		key_f_sharp: "r",
		key_f_flat: "v",
		key_g: "g",
		key_g_sharp: "t",
		key_g_flat: "b",
		key_a: "h",
		key_a_sharp: "y",
		key_a_flat: "n",
		key_b: "j",
		key_b_sharp: "u",
		key_b_flat: "m",
	},
};

function setAuthUser(user: { id: number } | null) {
	mockUseAuthStore.mockReturnValue({ user });
}

beforeEach(() => {
	vi.clearAllMocks();
	setAuthUser(null);
});

describe("useKeyboardBindings", () => {
	it("returns data when user is authenticated and bindings exist", async () => {
		setAuthUser({ id: 42 });
		mockGetKeyboardBindings.mockResolvedValue(fakeBindings);

		const { result } = renderHook(() => useKeyboardBindings(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toEqual(fakeBindings);
		expect(mockGetKeyboardBindings).toHaveBeenCalledTimes(1);
	});

	it("returns null when bindings don't exist (404 case)", async () => {
		setAuthUser({ id: 42 });
		mockGetKeyboardBindings.mockResolvedValue(null);

		const { result } = renderHook(() => useKeyboardBindings(), {
			wrapper: createWrapper(),
		});

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(result.current.data).toBeNull();
	});

	it("has suppressErrorToast: true in meta", () => {
		setAuthUser({ id: 42 });
		mockGetKeyboardBindings.mockResolvedValue(fakeBindings);

		const wrapper = createWrapper();
		renderHook(() => useKeyboardBindings(), { wrapper });

		// The query's meta should include suppressErrorToast
		// We can verify by checking the query client's query cache
		const queryClient = (wrapper({ children: null }) as React.ReactElement)
			.props.client as QueryClient;

		const queries = queryClient.getQueryCache().findAll();
		const kbQuery = queries.find((q) =>
			q.queryKey.includes("keyboard-bindings"),
		);
		expect(kbQuery?.meta).toEqual({ suppressErrorToast: true });
	});

	it("query is disabled when no auth user", async () => {
		setAuthUser(null);
		mockGetKeyboardBindings.mockResolvedValue(fakeBindings);

		const { result } = renderHook(() => useKeyboardBindings(), {
			wrapper: createWrapper(),
		});

		// Give it a tick to confirm query never fires
		await new Promise((r) => setTimeout(r, 50));

		expect(result.current.fetchStatus).toBe("idle");
		expect(mockGetKeyboardBindings).not.toHaveBeenCalled();
	});
});

describe("useSaveKeyboardBindings", () => {
	it("calls userService.saveKeyboardBindings when mutate is invoked", async () => {
		mockSaveKeyboardBindings.mockResolvedValue(fakeBindings);

		const { result } = renderHook(() => useSaveKeyboardBindings(), {
			wrapper: createWrapper(),
		});

		const request: KeyboardBindingsRequest = {
			key_bindings: fakeBindings.key_bindings,
		};

		result.current.mutate(request);

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		expect(mockSaveKeyboardBindings).toHaveBeenCalledWith(request);
	});

	it("invalidates the keyboard-bindings query key on success", async () => {
		setAuthUser({ id: 42 });
		mockGetKeyboardBindings.mockResolvedValue(fakeBindings);
		mockSaveKeyboardBindings.mockResolvedValue(fakeBindings);

		const wrapper = createWrapper();

		// First render the query hook to populate cache
		const { result: queryResult } = renderHook(() => useKeyboardBindings(), {
			wrapper,
		});

		await waitFor(() => {
			expect(queryResult.current.isSuccess).toBe(true);
		});

		// Reset the mock to track new calls after invalidation
		mockGetKeyboardBindings.mockClear();
		mockGetKeyboardBindings.mockResolvedValue(fakeBindings);

		// Now render the mutation hook with the same wrapper (same QueryClient)
		const { result: mutationResult } = renderHook(
			() => useSaveKeyboardBindings(),
			{ wrapper },
		);

		const request: KeyboardBindingsRequest = {
			key_bindings: fakeBindings.key_bindings,
		};

		mutationResult.current.mutate(request);

		await waitFor(() => {
			expect(mutationResult.current.isSuccess).toBe(true);
		});

		// The invalidation should trigger a refetch
		await waitFor(() => {
			expect(mockGetKeyboardBindings).toHaveBeenCalled();
		});
	});

	it("has errorTitle in meta for error toast", async () => {
		mockSaveKeyboardBindings.mockResolvedValue(fakeBindings);

		const wrapper = createWrapper();
		const { result } = renderHook(() => useSaveKeyboardBindings(), {
			wrapper,
		});

		// Trigger the mutation so it appears in the cache
		result.current.mutate({ key_bindings: fakeBindings.key_bindings });

		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true);
		});

		// Access the mutation's meta through the query client's mutation cache
		const queryClient = (wrapper({ children: null }) as React.ReactElement)
			.props.client as QueryClient;

		const mutations = queryClient.getMutationCache().getAll();
		const saveMutation = mutations.find(
			(m) => m.options.meta?.errorTitle === "Failed to save key bindings",
		);
		expect(saveMutation).toBeDefined();
		expect(saveMutation?.options.meta).toEqual({
			errorTitle: "Failed to save key bindings",
		});
	});
});

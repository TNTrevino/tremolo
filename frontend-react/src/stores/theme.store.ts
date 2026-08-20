import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "dark" | "light";

interface ThemeState {
	theme: Theme;
	setTheme: (theme: Theme) => void;
	toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
	persist(
		(set) => ({
			theme: "dark",
			setTheme: (theme) => {
				set({ theme });
				// Update DOM class
				const root = window.document.documentElement;
				root.classList.remove("light", "dark");
				root.classList.add(theme);
			},
			toggleTheme: () => {
				set((state) => {
					const newTheme = state.theme === "dark" ? "light" : "dark";
					// Update DOM class
					const root = window.document.documentElement;
					root.classList.remove("light", "dark");
					root.classList.add(newTheme);
					return { theme: newTheme };
				});
			},
		}),
		{
			name: "tremolo-theme",
			// Rehydrate theme on load
			onRehydrateStorage: () => (state) => {
				if (state) {
					const root = window.document.documentElement;
					root.classList.remove("light", "dark");
					root.classList.add(state.theme);
				}
			},
		},
	),
);

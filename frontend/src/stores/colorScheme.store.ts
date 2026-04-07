import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ColorSchemeResponse } from "@/services/api/types";

interface ColorSchemeState {
	activeScheme: ColorSchemeResponse | null;
	isDark: boolean;
	setActiveScheme: (scheme: ColorSchemeResponse) => void;
	clearScheme: () => void;
}

const CSS_VAR_MAP: Record<string, string> = {
	background: "--background",
	foreground: "--foreground",
	card: "--card",
	card_foreground: "--card-foreground",
	popover: "--popover",
	popover_foreground: "--popover-foreground",
	primary: "--primary",
	primary_foreground: "--primary-foreground",
	secondary: "--secondary",
	secondary_foreground: "--secondary-foreground",
	muted: "--muted",
	muted_foreground: "--muted-foreground",
	accent: "--accent",
	accent_foreground: "--accent-foreground",
	destructive: "--destructive",
	destructive_foreground: "--destructive-foreground",
	border: "--border",
	input: "--input",
	ring: "--ring",
};

function applyScheme(scheme: ColorSchemeResponse): void {
	const root = window.document.documentElement;

	// Set all CSS custom properties
	for (const [field, cssVar] of Object.entries(CSS_VAR_MAP)) {
		const value = scheme.colors[field as keyof typeof scheme.colors];
		root.style.setProperty(cssVar, value);
	}

	// Toggle dark/light class
	root.classList.remove("light", "dark");
	root.classList.add(scheme.is_dark ? "dark" : "light");
}

export const useColorSchemeStore = create<ColorSchemeState>()(
	persist(
		(set) => ({
			activeScheme: null,
			isDark: false,
			setActiveScheme: (scheme) => {
				applyScheme(scheme);
				set({ activeScheme: scheme, isDark: scheme.is_dark });
			},
			clearScheme: () => {
				const root = window.document.documentElement;

				// Remove all inline style overrides to revert to index.css defaults
				for (const cssVar of Object.values(CSS_VAR_MAP)) {
					root.style.removeProperty(cssVar);
				}

				set({ activeScheme: null, isDark: false });
			},
		}),
		{
			name: "tremolo-color-scheme",
			onRehydrateStorage: () => (state) => {
				if (state?.activeScheme) {
					try {
						applyScheme(state.activeScheme);
					} catch (e) {
						console.error("Failed to rehydrate color scheme from storage", e);
						state.activeScheme = null;
						state.isDark = false;
					}
				}
			},
		},
	),
);

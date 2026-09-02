import { effect, Injectable, signal } from "@angular/core";

export type Theme = "dark" | "light";

/** The key React's Zustand store persisted under. Unchanged on purpose. */
export const THEME_STORAGE_KEY = "tremolo-theme";

interface PersistedTheme {
	state: { theme: Theme };
	version: number;
}

const PERSIST_VERSION = 0;
const DEFAULT_THEME: Theme = "dark";

/**
 * Signal store (D7, PLAN.md 5.3) replacing the Zustand
 * frontend-react/src/stores/theme.store.ts.
 *
 * Three behaviours have to survive, because the parity suite drives all
 * three:
 *
 * - the `dark`/`light` class on `documentElement` is what Tailwind's
 *   `darkMode: ["class"]` reads, so it is the theme;
 * - the choice persists across a reload (Zustand's `persist`);
 * - it is re-applied on load (Zustand's `onRehydrateStorage`), before the
 *   first paint -- hence the synchronous `apply()` in the constructor
 *   rather than waiting for the effect's first run.
 *
 * The localStorage envelope is kept byte-compatible with Zustand's, the
 * same call Phase 1 made for `tremolo-auth`, so a theme chosen in either
 * app is honoured by the other while both exist. (The E2E helper toggles
 * the theme through the UI and never reads this key, so nothing in the
 * suite depends on the format either way.)
 */
@Injectable({ providedIn: "root" })
export class ThemeStore {
	private readonly _theme = signal<Theme>(DEFAULT_THEME);

	readonly theme = this._theme.asReadonly();

	constructor() {
		this.hydrate();
		this.apply(this._theme());
		effect(() => {
			const theme = this._theme();
			this.apply(theme);
			this.persist(theme);
		});
	}

	setTheme(theme: Theme): void {
		this._theme.set(theme);
	}

	toggleTheme(): void {
		this._theme.update((theme) => (theme === "dark" ? "light" : "dark"));
	}

	private hydrate(): void {
		const raw = localStorage.getItem(THEME_STORAGE_KEY);
		if (!raw) return;

		try {
			const parsed = JSON.parse(raw) as Partial<PersistedTheme>;
			const stored = parsed.state?.theme;
			if (stored === "dark" || stored === "light") this._theme.set(stored);
		} catch {
			// Same call the auth store makes: a corrupt blob is dropped rather
			// than allowed to break the boot.
			localStorage.removeItem(THEME_STORAGE_KEY);
		}
	}

	private apply(theme: Theme): void {
		const root = document.documentElement;
		root.classList.remove("light", "dark");
		root.classList.add(theme);
	}

	private persist(theme: Theme): void {
		const payload: PersistedTheme = {
			state: { theme },
			version: PERSIST_VERSION,
		};
		localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(payload));
	}
}

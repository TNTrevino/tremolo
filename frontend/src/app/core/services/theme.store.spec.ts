import { TestBed } from "@angular/core/testing";

import { THEME_STORAGE_KEY, ThemeStore } from "./theme.store";

/**
 * The three behaviours the parity suite drives through the nav toggle:
 * the class on `documentElement` (which is what Tailwind's
 * `darkMode: ["class"]` reads), persistence, and re-application on load.
 */
describe("ThemeStore", () => {
	beforeEach(() => {
		localStorage.clear();
		document.documentElement.classList.remove("light", "dark");
		TestBed.configureTestingModule({});
	});

	function stored(): unknown {
		return JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? "null");
	}

	it("defaults to dark and applies the class immediately", () => {
		const store = TestBed.inject(ThemeStore);

		expect(store.theme()).toBe("dark");
		expect(document.documentElement.classList.contains("dark")).toBe(true);
	});

	it("toggles, swapping the class rather than adding a second one", () => {
		const store = TestBed.inject(ThemeStore);

		store.toggleTheme();
		TestBed.tick();

		expect(store.theme()).toBe("light");
		expect(document.documentElement.classList.contains("light")).toBe(true);
		expect(document.documentElement.classList.contains("dark")).toBe(false);
	});

	it("persists in the envelope the React app wrote", () => {
		const store = TestBed.inject(ThemeStore);

		store.setTheme("light");
		TestBed.tick();

		expect(stored()).toEqual({ state: { theme: "light" }, version: 0 });
	});

	it("re-applies a stored theme on construction", () => {
		localStorage.setItem(
			THEME_STORAGE_KEY,
			JSON.stringify({ state: { theme: "light" }, version: 0 }),
		);

		const store = TestBed.inject(ThemeStore);

		expect(store.theme()).toBe("light");
		expect(document.documentElement.classList.contains("light")).toBe(true);
	});

	it("starts from the default and drops a corrupt blob", () => {
		localStorage.setItem(THEME_STORAGE_KEY, "{not json");

		const store = TestBed.inject(ThemeStore);

		expect(store.theme()).toBe("dark");
		expect(localStorage.getItem(THEME_STORAGE_KEY)).not.toBe("{not json");
	});

	it("ignores a stored value that is not a theme", () => {
		localStorage.setItem(
			THEME_STORAGE_KEY,
			JSON.stringify({ state: { theme: "purple" }, version: 0 }),
		);

		expect(TestBed.inject(ThemeStore).theme()).toBe("dark");
	});
});

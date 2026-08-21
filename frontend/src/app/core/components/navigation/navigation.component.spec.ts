import { provideHttpClient } from "@angular/common/http";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { provideIcons } from "@ng-icons/core";

import { signIn } from "../../../../testing/auth-fixtures";
import { AuthStore } from "../../../auth/services/auth.store";
import { FriendsUiStore } from "../../../features/friends/services/friends.store";
import { TREMOLO_ICONS } from "../../icons";
import { ThemeStore } from "../../services/theme.store";
import { NavigationComponent } from "./navigation.component";

/**
 * Port of frontend-react/src/shared/components/layout/Navigation.test.tsx,
 * plus the accessible names Phase 0 added to the React app so the parity
 * suite could reach these controls. Those names are acceptance criteria,
 * not styling, so they are asserted here rather than left to the E2E run.
 */
describe("NavigationComponent", () => {
	let fixture: ComponentFixture<NavigationComponent>;
	let store: AuthStore;

	beforeEach(async () => {
		localStorage.clear();
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				provideHttpClient(),
				provideIcons(TREMOLO_ICONS),
			],
		});
		store = TestBed.inject(AuthStore);
		fixture = TestBed.createComponent(NavigationComponent);
		await fixture.whenStable();
	});

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	function byLabel(label: string): HTMLElement | null {
		return el().querySelector(`[aria-label="${label}"]`);
	}

	function linkTexts(): string[] {
		return [...el().querySelectorAll("a")].map(
			(a) => a.textContent?.trim() ?? "",
		);
	}

	async function signInAs(role: "STUDENT" | "TEACHER"): Promise<void> {
		signIn(store, role);
		await fixture.whenStable();
	}

	it("renders a navigation landmark, which every route spec asserts is visible", () => {
		expect(el().querySelector("nav")).not.toBeNull();
	});

	describe("when signed out", () => {
		it("offers a Login link", () => {
			expect(linkTexts().some((text) => /login/i.test(text))).toBe(true);
		});

		it("shows no account menu", () => {
			expect(byLabel("Account menu")).toBeNull();
		});

		it("hides the friends toggle", () => {
			expect(byLabel("Open friends")).toBeNull();
			expect(byLabel("Close friends")).toBeNull();
		});
	});

	describe("when signed in", () => {
		it("shows the account menu with the user's initials", async () => {
			await signInAs("STUDENT");

			const account = byLabel("Account menu");
			expect(account).not.toBeNull();
			expect(account!.textContent?.trim()).toBe("TU");
		});

		it("drops the Login link", async () => {
			await signInAs("STUDENT");

			expect(linkTexts().some((text) => /^login$/i.test(text))).toBe(false);
		});

		it("keeps the user's name out of the DOM until the menu is opened", async () => {
			await signInAs("STUDENT");
			expect(el().textContent).not.toContain("Test User");

			(byLabel("Account menu") as HTMLButtonElement).click();
			await fixture.whenStable();

			expect(el().textContent).toContain("Test User");
			expect(el().textContent).toContain("user@tremolo.test");
		});

		it("shows the friends toggle, and names the action it performs", async () => {
			await signInAs("STUDENT");

			const open = byLabel("Open friends");
			expect(open).not.toBeNull();
			expect(open!.getAttribute("aria-expanded")).toBe("false");

			(open as HTMLButtonElement).click();
			await fixture.whenStable();

			expect(TestBed.inject(FriendsUiStore).isPanelOpen()).toBe(true);
			expect(byLabel("Close friends")).not.toBeNull();
			expect(byLabel("Close friends")!.getAttribute("aria-expanded")).toBe(
				"true",
			);
		});

		it("gives a student Assignments and a teacher Classes", async () => {
			await signInAs("STUDENT");
			expect(linkTexts()).toContain("Assignments");
			expect(linkTexts()).not.toContain("Classes");

			store.clear();
			await signInAs("TEACHER");
			expect(linkTexts()).toContain("Classes");
			expect(linkTexts()).not.toContain("Assignments");
		});
	});

	describe("navigation links", () => {
		it("renders the top-level links", () => {
			const texts = linkTexts();
			expect(texts.filter((t) => /tremolo/i.test(t)).length).toBeGreaterThan(0);
			expect(texts).toContain("Practice");
			expect(texts).toContain("About");
			expect(texts).toContain("Convert");
		});

		it("keeps the games behind the Games menu", async () => {
			expect(linkTexts()).not.toContain("Note Game");

			const games = [...el().querySelectorAll("button")].find((b) =>
				/games/i.test(b.textContent ?? ""),
			)!;
			expect(games.getAttribute("aria-expanded")).toBe("false");

			games.click();
			await fixture.whenStable();

			const texts = linkTexts();
			for (const label of [
				"Note Game",
				"Key Signatures",
				"Intervals",
				"Scales",
				"Chords",
			]) {
				expect(texts.some((text) => text.startsWith(label))).toBe(true);
			}
		});

		it("closes an open menu on Escape", async () => {
			const games = [...el().querySelectorAll("button")].find((b) =>
				/games/i.test(b.textContent ?? ""),
			)!;
			games.click();
			await fixture.whenStable();
			expect(games.getAttribute("aria-expanded")).toBe("true");

			document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
			await fixture.whenStable();

			expect(games.getAttribute("aria-expanded")).toBe("false");
		});
	});

	describe("theme toggle", () => {
		it("names the theme it switches to, which is how a spec reads the current one", async () => {
			const theme = TestBed.inject(ThemeStore);
			expect(theme.theme()).toBe("dark");
			expect(byLabel("Switch to light theme")).not.toBeNull();

			(byLabel("Switch to light theme") as HTMLButtonElement).click();
			await fixture.whenStable();

			expect(theme.theme()).toBe("light");
			expect(byLabel("Switch to dark theme")).not.toBeNull();
		});
	});

	/**
	 * Phase 3's verifier finding V1. The theme toggle, the friends toggle and
	 * the mobile-menu button are all `<app-button>`, whose host is
	 * `display: contents` -- and `space-x-*` works by putting `margin-left`
	 * on `> * + *`, which is that host element, where margins are ignored
	 * (sub-feature 1's handoff 7.3). React's `<Button>` *was* the button, so
	 * its `space-x-2` spaced them; ours silently dropped 8px per control,
	 * worst at mobile where the account menu is hidden and the mobile-menu
	 * button lands straight against the toggles.
	 *
	 * A class assertion, deliberately: this is a CSS mechanism, jsdom applies
	 * no Tailwind, and the whole point is that no behavioural test can see
	 * the defect.
	 */
	describe("the right-hand control cluster (finding V1)", () => {
		function cluster(): HTMLElement {
			const toggle = el().querySelector('[aria-label^="Switch to "]');
			return toggle?.closest("app-button")?.parentElement as HTMLElement;
		}

		it("spaces its display:contents children with flex gap, not space-x", () => {
			const classes = cluster().className.split(/\s+/);

			expect(classes).toContain("flex");
			expect(classes).toContain("gap-2");
			expect(classes.filter((c) => c.startsWith("space-x-"))).toEqual([]);
		});

		it("holds every control whose spacing depended on it", async () => {
			await signInAs("STUDENT");

			const labels = [...cluster().querySelectorAll("[aria-label]")].map((n) =>
				n.getAttribute("aria-label"),
			);
			expect(labels).toContain("Switch to light theme");
			expect(labels).toContain("Open friends");
			expect(labels).toContain("Open menu");
		});
	});

	describe("mobile menu", () => {
		it("names the action it performs and mounts its links only when open", async () => {
			expect(byLabel("Open menu")).not.toBeNull();
			expect(linkTexts().filter((t) => t === "About").length).toBe(1);

			(byLabel("Open menu") as HTMLButtonElement).click();
			await fixture.whenStable();

			expect(byLabel("Close menu")).not.toBeNull();
			// The mobile menu repeats the desktop links.
			expect(linkTexts().filter((t) => t === "About").length).toBe(2);
		});
	});
});

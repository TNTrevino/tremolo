import { TestBed } from "@angular/core/testing";

import { signIn } from "../../../testing/auth-fixtures";
import { AUTH_STORAGE_KEY, AuthStore } from "./auth.store";

describe("AuthStore", () => {
	beforeEach(() => {
		localStorage.clear();
		TestBed.configureTestingModule({});
	});

	it("derives isAuthenticated from the token", () => {
		const store = TestBed.inject(AuthStore);
		expect(store.isAuthenticated()).toBe(false);

		signIn(store, "STUDENT");

		expect(store.isAuthenticated()).toBe(true);
		expect(store.user()?.firstName).toBe("Test");
		expect(store.role()).toBe("STUDENT");
	});

	it("writes Zustand's persisted shape under the same key", () => {
		const store = TestBed.inject(AuthStore);
		signIn(store, "TEACHER");
		// The persist `effect()` is scheduled, not synchronous.
		TestBed.tick();

		const raw = localStorage.getItem(AUTH_STORAGE_KEY);
		expect(raw).not.toBeNull();
		expect(JSON.parse(raw as string)).toEqual({
			state: {
				user: {
					id: 1,
					email: "user@tremolo.test",
					firstName: "Test",
					lastName: "User",
					role: "TEACHER",
					hasGoogle: false,
					// #108: the signIn fixture defaults emailVerified to true.
					emailVerified: true,
				},
				token: "access-token",
				isAuthenticated: true,
			},
			version: 0,
		});
	});

	it("restores a session written by either app", () => {
		localStorage.setItem(
			AUTH_STORAGE_KEY,
			JSON.stringify({
				state: {
					user: {
						id: 9,
						email: "back@tremolo.test",
						firstName: "Back",
						lastName: "Again",
						role: "STUDENT",
						hasGoogle: false,
					},
					token: "persisted-token",
					isAuthenticated: true,
				},
				version: 0,
			}),
		);

		const store = TestBed.inject(AuthStore);

		expect(store.isAuthenticated()).toBe(true);
		expect(store.user()?.email).toBe("back@tremolo.test");
	});

	it("starts signed out when the stored blob is corrupt", () => {
		localStorage.setItem(AUTH_STORAGE_KEY, "{not json");

		const store = TestBed.inject(AuthStore);

		expect(store.isAuthenticated()).toBe(false);
		expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull();
	});

	it("clears both fields on sign out", () => {
		const store = TestBed.inject(AuthStore);
		signIn(store, "STUDENT");

		store.clear();

		expect(store.user()).toBeNull();
		expect(store.token()).toBeNull();
		expect(store.isAuthenticated()).toBe(false);
	});

	/**
	 * The port of react-router's location state. `takeNotice()` is the whole
	 * contract: the landing page reads it once, and a later page must not
	 * find it still there -- location state did not survive the next
	 * navigation either.
	 */
	describe("one-shot notices", () => {
		it("hands the pending notice over exactly once", () => {
			const store = TestBed.inject(AuthStore);

			expect(store.takeNotice()).toBeNull();

			store.setNotice("success", "Account created! Please log in.");

			expect(store.takeNotice()).toEqual({
				kind: "success",
				message: "Account created! Please log in.",
			});
			expect(store.takeNotice()).toBeNull();
		});

		it("keeps only the most recent notice", () => {
			const store = TestBed.inject(AuthStore);

			store.setNotice("error", "first");
			store.setNotice("info", "second");

			expect(store.takeNotice()).toEqual({ kind: "info", message: "second" });
		});

		it("stays out of the persisted session blob", () => {
			const store = TestBed.inject(AuthStore);
			signIn(store, "STUDENT");
			store.setNotice("error", "not for localStorage");
			TestBed.tick();

			expect(localStorage.getItem(AUTH_STORAGE_KEY)).not.toContain(
				"not for localStorage",
			);
		});
	});
});

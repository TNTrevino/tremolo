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
});

import { computed, effect, Injectable, signal } from "@angular/core";

import type { LoginResponse, User } from "../models/auth.models";
import { mapApiUserToUser } from "../models/user.mapper";

/**
 * Signal store (D7, PLAN.md 5.3) replacing the Zustand
 * `frontend-react/src/stores/auth.store.ts`.
 *
 * Two things change and one must not:
 *
 * - `isAuthenticated` was a THIRD stored field kept in sync by hand on every
 *   setter. It is a `computed` now, so it cannot drift.
 * - Zustand's `persist` middleware becomes an explicit read at construction
 *   plus an `effect()` that writes on change.
 * - The localStorage key (`tremolo-auth`) and the persisted JSON shape
 *   (`{ state: { user, token, isAuthenticated }, version }`) are unchanged,
 *   so a session written by either app is readable by the other. That is why
 *   `isAuthenticated` is still *written* even though it is derived.
 */
export const AUTH_STORAGE_KEY = "tremolo-auth";

/** Zustand's persist envelope. Kept byte-compatible on purpose. */
interface PersistedAuth {
	state: {
		user: User | null;
		token: string | null;
		isAuthenticated: boolean;
	};
	version: number;
}

const PERSIST_VERSION = 0;

/** How a one-shot notice is styled by the page that shows it. */
export type AuthNoticeKind = "success" | "error" | "info";

/**
 * A message handed from the page that navigates to the page that lands.
 *
 * React put these in react-router's location state -- signup -> /login
 * ("Account created! Please log in."), a failed Google callback -> /login,
 * and a Google account link -> /dashboard. Angular's router has no
 * equivalent that survives a `navigateByUrl`, so they ride here, exactly
 * as `redirectUrl` does.
 */
export interface AuthNotice {
	kind: AuthNoticeKind;
	message: string;
}

@Injectable({ providedIn: "root" })
export class AuthStore {
	private readonly _user = signal<User | null>(null);
	private readonly _token = signal<string | null>(null);

	readonly user = this._user.asReadonly();
	readonly token = this._token.asReadonly();

	/** Derived, never stored (was a hand-synced third field in Zustand). */
	readonly isAuthenticated = computed(() => this._token() !== null);

	readonly role = computed(() => this._user()?.role ?? null);

	/**
	 * Where the user was headed when `authGuard` bounced them to /login.
	 * Replaces react-router's `<Navigate state={{ from: location }} />`: the
	 * URL stays a bare `/login`, so this rides alongside it instead.
	 */
	readonly redirectUrl = signal<string | null>(null);

	private readonly _notice = signal<AuthNotice | null>(null);

	/**
	 * The pending one-shot notice. Set it before navigating; the landing
	 * page reads it with `takeNotice()`, which is what makes it one-shot --
	 * react-router's location state did not survive the next navigation
	 * either.
	 */
	setNotice(kind: AuthNoticeKind, message: string): void {
		this._notice.set({ kind, message });
	}

	/** Reads the pending notice and clears it. Returns null when there is none. */
	takeNotice(): AuthNotice | null {
		const notice = this._notice();
		if (notice) this._notice.set(null);
		return notice;
	}

	constructor() {
		this.hydrate();
		effect(() => this.persist(this._user(), this._token()));
	}

	setUser(user: User): void {
		this._user.set(user);
	}

	setToken(token: string): void {
		this._token.set(token);
	}

	setAuthFromLogin(response: LoginResponse): void {
		this._user.set(mapApiUserToUser(response.user));
		this._token.set(response.access_token);
	}

	clear(): void {
		this._user.set(null);
		this._token.set(null);
	}

	private hydrate(): void {
		const raw = localStorage.getItem(AUTH_STORAGE_KEY);
		if (!raw) return;

		try {
			const parsed = JSON.parse(raw) as Partial<PersistedAuth>;
			this._user.set(parsed.state?.user ?? null);
			this._token.set(parsed.state?.token ?? null);
		} catch {
			// A corrupt blob is not worth a broken boot: drop it and start
			// signed out, which is what Zustand's persist did too.
			localStorage.removeItem(AUTH_STORAGE_KEY);
		}
	}

	private persist(user: User | null, token: string | null): void {
		const payload: PersistedAuth = {
			state: { user, token, isAuthenticated: token !== null },
			version: PERSIST_VERSION,
		};
		localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
	}
}

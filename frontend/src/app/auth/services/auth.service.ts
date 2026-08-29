import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map, type Observable, tap, throwError } from "rxjs";

import { environment } from "../../../environments/environment";
import type {
	ApiUser,
	ForgotPasswordRequest,
	GoogleCallbackRequest,
	LoginRequest,
	LoginResponse,
	MessageResponse,
	RefreshTokenRequest,
	RefreshTokenResponse,
	RegisterRequest,
	RegisterResponse,
	ResetPasswordRequest,
} from "../models/auth.models";
import { AuthStore } from "./auth.store";
import { TokenStorage } from "./token.storage";

/**
 * Auth HTTP. Port of frontend-react/src/services/api/auth.service.ts.
 *
 * Observables in, Observables out (D5) -- no Promises, no bare values. The
 * `tap`s that store tokens are carried over from the React service, which
 * did the same thing after each await.
 */
@Injectable({ providedIn: "root" })
export class AuthService {
	private readonly http = inject(HttpClient);
	private readonly tokens = inject(TokenStorage);
	private readonly store = inject(AuthStore);
	private readonly base = `${environment.coreApi}/api/auth`;

	login(credentials: LoginRequest): Observable<LoginResponse> {
		return this.http
			.post<LoginResponse>(`${this.base}/login`, credentials)
			.pipe(tap((res) => this.acceptSession(res)));
	}

	register(userData: RegisterRequest): Observable<RegisterResponse> {
		// Deliberately does not sign the new account in -- same as React.
		return this.http.post<RegisterResponse>(`${this.base}/register`, userData);
	}

	/**
	 * Emits the new **access token**, which is the shape the refresh
	 * interceptor's `switchMap` consumes (PLAN.md 5.4). Both tokens are
	 * stored on the way through.
	 */
	refreshToken(): Observable<string> {
		const refresh_token = this.tokens.getRefreshToken();

		if (!refresh_token) {
			// An Observable failure, not a synchronous throw: the refresh
			// interceptor builds this inside a `catchError`, where a thrown
			// error would escape the stream instead of failing it.
			return throwError(() => new Error("No refresh token available"));
		}

		const payload: RefreshTokenRequest = { refresh_token };
		return this.http
			.post<RefreshTokenResponse>(`${this.base}/refresh`, payload)
			.pipe(
				tap((res) => {
					this.tokens.setTokens(res.access_token, res.refresh_token);
					this.store.setToken(res.access_token);
				}),
				map((res) => res.access_token),
			);
	}

	/**
	 * Local-only: the Go service has no logout endpoint. React dispatched an
	 * `auth:logout` window event here so the Zustand store could listen; the
	 * store is injectable now, so it is cleared directly.
	 */
	logout(): void {
		this.tokens.clearTokens();
		this.store.clear();
	}

	getCurrentUser(): Observable<ApiUser> {
		return this.http.get<ApiUser>(`${this.base}/me`);
	}

	googleCallback(request: GoogleCallbackRequest): Observable<LoginResponse> {
		return this.http
			.post<LoginResponse>(`${this.base}/google/callback`, request)
			.pipe(tap((res) => this.acceptSession(res)));
	}

	linkGoogle(request: GoogleCallbackRequest): Observable<{ message: string }> {
		return this.http.post<{ message: string }>(
			`${this.base}/google/link`,
			request,
		);
	}

	/**
	 * #248. No session side effects -- unlike `login`, there is no token
	 * pair to store: the response is just the confirmation message, and it
	 * is identical whether or not the address has an account.
	 */
	forgotPassword(body: ForgotPasswordRequest): Observable<MessageResponse> {
		return this.http.post<MessageResponse>(
			`${this.base}/forgot-password`,
			body,
		);
	}

	/** #248. Also no session side effects -- resetting a password does not sign the visitor in. */
	resetPassword(body: ResetPasswordRequest): Observable<MessageResponse> {
		return this.http.post<MessageResponse>(`${this.base}/reset-password`, body);
	}

	/**
	 * #108. No session side effects, same as resetPassword -- confirming an
	 * address does not sign the visitor in on its own.
	 */
	verifyEmail(token: string): Observable<MessageResponse> {
		return this.http.post<MessageResponse>(`${this.base}/verify-email`, {
			token,
		});
	}

	/**
	 * #108. No body: the bearer token (attached by authInterceptor) is what
	 * identifies the account to mail.
	 */
	resendVerification(): Observable<MessageResponse> {
		return this.http.post<MessageResponse>(
			`${this.base}/resend-verification`,
			{},
		);
	}

	private acceptSession(res: LoginResponse): void {
		this.tokens.setTokens(res.access_token, res.refresh_token);
		this.store.setAuthFromLogin(res);
	}
}

import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import type { Observable } from "rxjs";

import { environment } from "../../../../environments/environment";
import type { MessageResponse } from "../../../auth/models/auth.models";
import type { UserExport } from "../models/export.models";

/** PUT /api/users/{userId}/password body. */
export interface ChangePasswordRequest {
	current_password: string;
	new_password: string;
}

/** POST /api/users/{userId}/email body. */
export interface RequestEmailChangeRequest {
	current_password: string;
	new_email: string;
}

/** POST /api/auth/confirm-email-change response -- email rides along so
 * the caller can refresh the stored user without a second round trip. */
export interface ConfirmEmailChangeResponse {
	message: string;
	email: string;
}

/**
 * The account-settings HTTP calls core-api's user_info_controller.go does
 * not cover: changing the caller's own password and email address (#249),
 * and downloading the caller's own data export (#243).
 *
 * Plain http calls to environment.coreApi, same shape as AuthService --
 * Observables in, Observables out, no session side effects of its own
 * (the caller decides what to do with a successful response, e.g.
 * refreshing the stored user after a confirmed email change).
 */
@Injectable({ providedIn: "root" })
export class AccountService {
	private readonly http = inject(HttpClient);
	private readonly usersBase = `${environment.coreApi}/api/users`;
	private readonly authBase = `${environment.coreApi}/api/auth`;

	changePassword(
		userId: number,
		body: ChangePasswordRequest,
	): Observable<MessageResponse> {
		return this.http.put<MessageResponse>(
			`${this.usersBase}/${userId}/password`,
			body,
		);
	}

	requestEmailChange(
		userId: number,
		body: RequestEmailChangeRequest,
	): Observable<MessageResponse> {
		return this.http.post<MessageResponse>(
			`${this.usersBase}/${userId}/email`,
			body,
		);
	}

	confirmEmailChange(token: string): Observable<ConfirmEmailChangeResponse> {
		return this.http.post<ConfirmEmailChangeResponse>(
			`${this.authBase}/confirm-email-change`,
			{ token },
		);
	}

	/**
	 * GET /api/users/{userId}/export -- the caller's full data export
	 * (#243). A plain `<a download>` pointed at this URL could not work:
	 * the route is self-only and needs a bearer token, which a bare
	 * anchor sends none of. This is a normal HTTP request instead, so
	 * authInterceptor attaches one same as any other call, and parsing
	 * the response as `UserExport` keeps it typed all the way to
	 * account-page.component.ts's `saveExport` -- and lets a spec flush a
	 * plain object rather than fabricating a Blob.
	 */
	exportData(userId: number): Observable<UserExport> {
		return this.http.get<UserExport>(`${this.usersBase}/${userId}/export`);
	}
}

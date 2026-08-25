import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../../environments/environment";
import type { UserExport } from "../models/export.models";
import { AccountService } from "./account.service";

const USERS = `${environment.coreApi}/api/users`;
const AUTH = `${environment.coreApi}/api/auth`;

const EXPORT_FIXTURE: UserExport = {
	exported_at: "2026-08-25T00:00:00Z",
	profile: {
		id: 42,
		first_name: "Baseline",
		last_name: "Student",
		email: "baseline.student@tremolo.test",
		role: "STUDENT",
		instrument: "",
		school: "",
		has_google: false,
		created_date: "2026-01-01",
		created_time: "00:00:00",
	},
	settings: { note_game: null, games: [] },
	keyboard_bindings: null,
	score_entries: [],
	classes: { joined: [], owned: [] },
	assignment_attempts: [],
	friends: [],
};

describe("AccountService", () => {
	let service: AccountService;
	let backend: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()],
		});
		service = TestBed.inject(AccountService);
		backend = TestBed.inject(HttpTestingController);
	});

	afterEach(() => backend.verify());

	it("PUTs the current and new password to the caller's own password route", () => {
		service
			.changePassword(42, {
				current_password: "Old-Passw0rd!",
				new_password: "New-Passw0rd!",
			})
			.subscribe();

		const req = backend.expectOne(`${USERS}/42/password`);
		expect(req.request.method).toBe("PUT");
		expect(req.request.body).toEqual({
			current_password: "Old-Passw0rd!",
			new_password: "New-Passw0rd!",
		});
		req.flush({ message: "Password updated." });
	});

	it("POSTs the current password and new address to the caller's own email route", () => {
		service
			.requestEmailChange(42, {
				current_password: "Old-Passw0rd!",
				new_email: "new@example.com",
			})
			.subscribe();

		const req = backend.expectOne(`${USERS}/42/email`);
		expect(req.request.method).toBe("POST");
		expect(req.request.body).toEqual({
			current_password: "Old-Passw0rd!",
			new_email: "new@example.com",
		});
		req.flush({ message: "Check your new address for a confirmation link." });
	});

	it("POSTs the token to confirm-email-change", () => {
		let result: { message: string; email: string } | undefined;
		service.confirmEmailChange("kula-token").subscribe((res) => (result = res));

		const req = backend.expectOne(`${AUTH}/confirm-email-change`);
		expect(req.request.method).toBe("POST");
		expect(req.request.body).toEqual({ token: "kula-token" });
		req.flush({
			message: "Your email address has been updated.",
			email: "new@example.com",
		});

		expect(result).toEqual({
			message: "Your email address has been updated.",
			email: "new@example.com",
		});
	});

	it("GETs the caller's own data export", () => {
		let result: UserExport | undefined;
		service.exportData(42).subscribe((res) => (result = res));

		const req = backend.expectOne(`${USERS}/42/export`);
		expect(req.request.method).toBe("GET");
		req.flush(EXPORT_FIXTURE);

		expect(result).toEqual(EXPORT_FIXTURE);
	});
});

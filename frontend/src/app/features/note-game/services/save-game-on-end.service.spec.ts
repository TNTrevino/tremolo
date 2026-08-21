import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AuthStore } from "../../../auth/services/auth.store";
import { NotificationService } from "../../../core/services/notification.service";
import { environment } from "../../../../environments/environment";
import type { GameStats } from "../models/engine.models";
import { GameMode } from "../models/engine.models";
import { SaveGameOnEndService } from "./save-game-on-end.service";

const ENTRY_URL = `${environment.mainApi}/api/note-game/entry`;

const TIMED: GameStats = {
	npm: 48,
	accuracy: 80,
	correct: 8,
	total: 10,
	gameMode: GameMode.Time,
	limit: 30,
};

describe("SaveGameOnEndService", () => {
	let save: SaveGameOnEndService;
	let backend: HttpTestingController;
	let auth: AuthStore;
	let notifications: NotificationService;

	beforeEach(() => {
		localStorage.clear();
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				SaveGameOnEndService,
			],
		});
		save = TestBed.inject(SaveGameOnEndService);
		backend = TestBed.inject(HttpTestingController);
		auth = TestBed.inject(AuthStore);
		notifications = TestBed.inject(NotificationService);
	});

	afterEach(() => {
		backend.verify();
		TestBed.resetTestingModule();
		localStorage.clear();
	});

	function signIn(): void {
		auth.setToken("token");
		auth.setUser({
			id: 7,
			email: "student@example.com",
			firstName: "Test",
			lastName: "Student",
			role: "STUDENT",
		});
	}

	it("saves nothing for an anonymous player", () => {
		save.handleGameEnd(TIMED, "note");
		backend.expectNone(ENTRY_URL);
	});

	it("posts the entry and reports success", () => {
		signIn();
		save.handleGameEnd(TIMED, "note");

		const req = backend.expectOne(ENTRY_URL);
		expect(req.request.body).toEqual({
			// 30s in time mode -> "00:00:30".
			time_length: "00:00:30",
			total_questions: 10,
			correct_questions: 8,
			user_id: 7,
			notes_per_minute: 48,
			game_type: "note",
			assignment_id: undefined,
		});
		req.flush({ message: "ok", id: 1 });

		expect(save.saveError()).toBe(false);
		// The exact string e2e/support/app.ts waits for.
		expect(notifications.toasts().at(-1)?.message).toBe(
			"Game results saved successfully!",
		);
	});

	it("reconstructs the elapsed time in notes mode", () => {
		signIn();
		save.handleGameEnd(
			{ ...TIMED, gameMode: GameMode.Notes, limit: 10, npm: 50, total: 10 },
			"note",
		);

		const req = backend.expectOne(ENTRY_URL);
		// 10 questions at 50/min = 12s.
		expect(req.request.body.time_length).toBe("00:00:12");
		req.flush({ message: "ok", id: 1 });
	});

	it("survives a zero rate without dividing by zero", () => {
		signIn();
		save.handleGameEnd(
			{ ...TIMED, gameMode: GameMode.Notes, npm: 0, total: 3 },
			"note",
		);

		const req = backend.expectOne(ENTRY_URL);
		expect(req.request.body.time_length).toBe("00:03:00");
		req.flush({ message: "ok", id: 1 });
	});

	it("tags an assignment attempt and omits the key otherwise", () => {
		signIn();
		save.handleGameEnd(TIMED, "note", 42);

		const req = backend.expectOne(ENTRY_URL);
		expect(req.request.body.assignment_id).toBe(42);
		req.flush({ message: "ok", id: 1 });
	});

	it("reports a rejected save without pretending it worked", () => {
		signIn();
		save.handleGameEnd(TIMED, "note");

		// The Go DTO marks correct_questions `required`, which refuses a
		// zero -- a real game that scored nothing comes back 400.
		backend
			.expectOne(ENTRY_URL)
			.flush("invalid entry", { status: 400, statusText: "Bad Request" });

		expect(save.saveError()).toBe(true);
		expect(notifications.toasts().at(-1)?.message).toMatch(
			/Failed to save game results/,
		);
	});

	describe("save-once", () => {
		it("posts once when the same game end arrives twice", () => {
			signIn();
			save.handleGameEnd(TIMED, "note");
			save.handleGameEnd(TIMED, "note");

			backend.expectOne(ENTRY_URL).flush({ message: "ok", id: 1 });
			backend.expectNone(ENTRY_URL);
		});

		it("accepts the next game once the first save has settled", () => {
			signIn();
			save.handleGameEnd(TIMED, "note");
			backend.expectOne(ENTRY_URL).flush({ message: "ok", id: 1 });

			save.handleGameEnd(TIMED, "note");
			backend.expectOne(ENTRY_URL).flush({ message: "ok", id: 2 });
		});

		it("does not wedge after a failure", () => {
			signIn();
			save.handleGameEnd(TIMED, "note");
			backend
				.expectOne(ENTRY_URL)
				.flush("nope", { status: 500, statusText: "Server Error" });

			save.handleGameEnd(TIMED, "note");
			backend.expectOne(ENTRY_URL).flush({ message: "ok", id: 2 });
			expect(save.saveError()).toBe(false);
		});
	});
});

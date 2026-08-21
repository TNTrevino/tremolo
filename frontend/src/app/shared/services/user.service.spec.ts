import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../environments/environment";
import type {
	GameSettings,
	KeyBindings,
	NoteGameSettings,
} from "../models/game.models";
import type { UserProfile } from "../models/user.models";
import { UserService } from "./user.service";

const API = environment.mainApi;

/**
 * Ports frontend-react/src/services/api/user.service.test.ts -- whose two
 * cases both pinned `saveGameResult`'s body -- and extends it to the rest of
 * the surface, because the Promise-to-Observable rewrite touched every
 * method and the DTO mapping is new here.
 *
 * The two inherited cases are the first two under "saveGameResult".
 */
describe("UserService", () => {
	let service: UserService;
	let backend: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()],
		});
		service = TestBed.inject(UserService);
		backend = TestBed.inject(HttpTestingController);
	});

	afterEach(() => backend.verify());

	describe("getProfile", () => {
		it("maps the Go service's snake_case payload to the domain shape", () => {
			let profile: UserProfile | undefined;
			service.getProfile(42).subscribe((p) => (profile = p));

			backend.expectOne(`${API}/api/users/42/general-info`).flush({
				first_name: "Baseline",
				last_name: "Student",
				role: "STUDENT",
				created_date: "Joined 12 Mar 2024",
				total_entries: 17,
				total_duration: "00:42:00",
			});

			expect(profile).toEqual({
				firstName: "Baseline",
				lastName: "Student",
				role: "STUDENT",
				createdDate: "Joined 12 Mar 2024",
				totalEntries: 17,
				totalDuration: "00:42:00",
			});
		});
	});

	describe("charts", () => {
		it("sends no query string when no params are given", () => {
			service.getStats(42).subscribe();
			const req = backend.expectOne(`${API}/api/charts/user/42/metrics`);
			expect(req.request.params.keys()).toEqual([]);
			req.flush(EMPTY_METRICS);
		});

		it("sends interval and days when they are given", () => {
			service.getStats(42, { interval: "week", days: 30 }).subscribe();
			const req = backend.expectOne(
				(r) => r.url === `${API}/api/charts/user/42/metrics`,
			);
			expect(req.request.params.get("interval")).toBe("week");
			expect(req.request.params.get("days")).toBe("30");
			req.flush(EMPTY_METRICS);
		});

		it("passes chart metrics through untouched -- Go already sends camelCase", () => {
			let data: unknown;
			service.getClassMetrics().subscribe((d) => (data = d));
			backend
				.expectOne(`${API}/api/charts/teacher/class-metrics`)
				.flush(EMPTY_METRICS);
			expect(data).toEqual(EMPTY_METRICS);
		});
	});

	describe("saveGameResult", () => {
		it("tags the entry with assignment_id when playing an assignment", () => {
			service
				.saveGameResult({
					timeLength: "00:00:30",
					totalQuestions: 20,
					correctQuestions: 15,
					userId: 42,
					notesPerMinute: 30,
					gameType: "scale",
					assignmentId: 7,
				})
				.subscribe();

			const req = backend.expectOne(`${API}/api/note-game/entry`);
			expect(req.request.body).toMatchObject({
				assignment_id: 7,
				game_type: "scale",
			});
			req.flush({ message: "ok", id: 1 });
		});

		it("leaves assignment_id undefined for normal (untagged) play", () => {
			service
				.saveGameResult({
					timeLength: "00:00:30",
					totalQuestions: 20,
					correctQuestions: 15,
					userId: 42,
					notesPerMinute: 30,
				})
				.subscribe();

			const req = backend.expectOne(`${API}/api/note-game/entry`);
			const body = req.request.body as Record<string, unknown>;
			expect(body["assignment_id"]).toBeUndefined();
			expect(body["game_type"]).toBe("note");
			req.flush({ message: "ok", id: 1 });
		});

		it("sends the rest of the entry snake_cased", () => {
			service
				.saveGameResult({
					timeLength: "00:01:00",
					totalQuestions: 40,
					correctQuestions: 39,
					userId: 9,
					notesPerMinute: 39,
				})
				.subscribe();

			const req = backend.expectOne(`${API}/api/note-game/entry`);
			expect(req.request.body).toMatchObject({
				time_length: "00:01:00",
				total_questions: 40,
				correct_questions: 39,
				user_id: 9,
				notes_per_minute: 39,
			});
			req.flush({ message: "ok", id: 2 });
		});
	});

	describe("recent entries and activity", () => {
		it("maps every recent entry", () => {
			let entries: unknown;
			service.getRecentGameEntries().subscribe((e) => (entries = e));

			backend.expectOne(`${API}/api/note-game/recent`).flush([
				{
					id: 3,
					user_id: 42,
					time_length: "00:00:30",
					total_questions: 20,
					correct_questions: 18,
					notes_per_minute: 36,
					created_date: "2026-08-19",
				},
			]);

			expect(entries).toEqual([
				{
					id: 3,
					userId: 42,
					timeLength: "00:00:30",
					totalQuestions: 20,
					correctQuestions: 18,
					notesPerMinute: 36,
					createdDate: "2026-08-19",
				},
			]);
		});

		it("maps game_count to gameCount for the heatmap", () => {
			let activity: unknown;
			service.getActivityHeatmap().subscribe((a) => (activity = a));

			backend
				.expectOne(`${API}/api/note-game/activity`)
				.flush([{ date: "2026-08-19", game_count: 4 }]);

			expect(activity).toEqual([{ date: "2026-08-19", gameCount: 4 }]);
		});
	});

	describe("optional settings resources", () => {
		it("maps a 404 to null", () => {
			let settings: NoteGameSettings | null | undefined = undefined;
			service.getNoteGameSettings().subscribe((s) => (settings = s));

			backend
				.expectOne(`${API}/api/note-game/settings`)
				.flush(null, { status: 404, statusText: "Not Found" });

			expect(settings).toBeNull();
		});

		it("maps the {settings: null} sentinel to null", () => {
			let settings: NoteGameSettings | null | undefined = undefined;
			service.getNoteGameSettings().subscribe((s) => (settings = s));

			backend.expectOne(`${API}/api/note-game/settings`).flush({
				settings: null,
			});

			expect(settings).toBeNull();
		});

		it("re-throws anything that is not a 404", () => {
			let status: number | undefined;
			service.getNoteGameSettings().subscribe({
				error: (err: { status?: number }) => (status = err.status),
			});

			backend
				.expectOne(`${API}/api/note-game/settings`)
				.flush(null, { status: 500, statusText: "Server Error" });

			expect(status).toBe(500);
		});

		it("maps a saved note-game row", () => {
			let settings: NoteGameSettings | null | undefined = undefined;
			service.getNoteGameSettings().subscribe((s) => (settings = s));

			backend.expectOne(`${API}/api/note-game/settings`).flush(NOTE_ROW);

			expect(settings).toEqual({
				id: 1,
				userId: 42,
				gameMode: "time",
				timeLimit: 60,
				noteLimit: 25,
				scale: "C",
				octave: 4,
				lowNote: "C",
				highNote: "B",
				clef: "treble",
			});
		});

		it("sends the note-game PUT snake_cased, without id or user_id", () => {
			service
				.saveNoteGameSettings({
					gameMode: "time",
					timeLimit: 60,
					noteLimit: 25,
					scale: "C",
					octave: 4,
					lowNote: "C",
					highNote: "B",
					clef: "treble",
				})
				.subscribe();

			const req = backend.expectOne(`${API}/api/note-game/settings`);
			expect(req.request.method).toBe("PUT");
			expect(req.request.body).toEqual({
				game_mode: "time",
				time_limit: 60,
				note_limit: 25,
				scale: "C",
				octave: 4,
				low_note: "C",
				high_note: "B",
				clef: "treble",
			});
			req.flush(NOTE_ROW);
		});
	});

	describe("generic game settings", () => {
		it("selects the game with a game_type query param", () => {
			let settings: GameSettings | null | undefined = undefined;
			service.getGameSettings("key_signature").subscribe((s) => (settings = s));

			const req = backend.expectOne(
				(r) => r.url === `${API}/api/game-settings`,
			);
			expect(req.request.params.get("game_type")).toBe("key_signature");
			req.flush({
				id: 5,
				user_id: 42,
				game_type: "key_signature",
				config: { clef: "treble", majorOnly: true },
			});

			expect(settings).toEqual({
				id: 5,
				userId: 42,
				gameType: "key_signature",
				config: { clef: "treble", majorOnly: true },
			});
		});

		it("stores the JSONB config verbatim -- its keys are the game's, not ours", () => {
			const config = { snake_case_key: 1, camelCaseKey: 2 };
			service.saveGameSettings({ gameType: "chord", config }).subscribe();

			const req = backend.expectOne(`${API}/api/game-settings`);
			expect(req.request.body).toEqual({ game_type: "chord", config });
			req.flush({ id: 6, user_id: 42, game_type: "chord", config });
		});
	});

	describe("keyboard bindings", () => {
		it("wraps the binding map in key_bindings on the way out", () => {
			service.saveKeyboardBindings(BINDINGS).subscribe();

			const req = backend.expectOne(`${API}/api/note-game/keyboard-bindings`);
			expect(req.request.body).toEqual({ key_bindings: BINDINGS });
			req.flush({ id: 8, user_id: 42, key_bindings: BINDINGS });
		});

		it("unwraps it on the way back", () => {
			let bindings: unknown;
			service.getKeyboardBindings().subscribe((b) => (bindings = b));

			backend
				.expectOne(`${API}/api/note-game/keyboard-bindings`)
				.flush({ id: 8, user_id: 42, key_bindings: BINDINGS });

			expect(bindings).toEqual({
				id: 8,
				userId: 42,
				keyBindings: BINDINGS,
			});
		});
	});
});

const EMPTY_METRICS = {
	npm: [],
	accuracy: [],
	sessionCount: [],
	totalQuestions: [],
};

const NOTE_ROW = {
	id: 1,
	user_id: 42,
	game_mode: "time",
	time_limit: 60,
	note_limit: 25,
	scale: "C",
	octave: 4,
	low_note: "C",
	high_note: "B",
	clef: "treble" as const,
};

const BINDINGS: KeyBindings = {
	key_c: "a",
	key_c_sharp: "w",
	key_c_flat: "q",
	key_d: "s",
	key_d_sharp: "e",
	key_d_flat: "w",
	key_e: "d",
	key_e_sharp: "f",
	key_e_flat: "e",
	key_f: "f",
	key_f_sharp: "t",
	key_f_flat: "e",
	key_g: "g",
	key_g_sharp: "y",
	key_g_flat: "t",
	key_a: "h",
	key_a_sharp: "u",
	key_a_flat: "y",
	key_b: "j",
	key_b_sharp: "k",
	key_b_flat: "u",
};

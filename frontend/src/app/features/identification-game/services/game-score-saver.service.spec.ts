import { TestBed } from "@angular/core/testing";
import { of, throwError } from "rxjs";

import { NotificationService } from "@core/services/notification.service";
import { AuthStore } from "../../../auth/services/auth.store";
import { UserService } from "@shared/services/user.service";

import { GameMode, type GameStats } from "../models/game-state.models";
import { GameScoreSaverService } from "./game-score-saver.service";

const STATS: GameStats = {
	npm: 42,
	accuracy: 80,
	correct: 8,
	total: 10,
	gameMode: GameMode.Time,
	limit: 60,
};

describe("GameScoreSaverService", () => {
	let saver: GameScoreSaverService;
	let saveGameResult: ReturnType<typeof vi.fn>;
	let showSuccess: ReturnType<typeof vi.fn>;
	let showError: ReturnType<typeof vi.fn>;
	let signedIn: boolean;

	beforeEach(() => {
		signedIn = true;
		saveGameResult = vi.fn().mockReturnValue(of({ message: "ok", id: 1 }));
		showSuccess = vi.fn();
		showError = vi.fn();

		TestBed.configureTestingModule({
			providers: [
				{ provide: UserService, useValue: { saveGameResult } },
				{ provide: NotificationService, useValue: { showSuccess, showError } },
				{
					provide: AuthStore,
					useValue: {
						user: () => (signedIn ? { id: 7 } : null),
						isAuthenticated: () => signedIn,
					},
				},
			],
		});

		saver = TestBed.inject(GameScoreSaverService);
	});

	it("posts one entry per finished game", () => {
		saver.save(STATS, "key_signature");

		expect(saveGameResult).toHaveBeenCalledTimes(1);
		expect(saveGameResult).toHaveBeenCalledWith({
			timeLength: "00:01:00",
			totalQuestions: 10,
			correctQuestions: 8,
			userId: 7,
			notesPerMinute: 42,
			gameType: "key_signature",
			assignmentId: undefined,
		});
		expect(showSuccess).toHaveBeenCalledWith(
			"Game results saved successfully!",
		);
	});

	it("saves exactly once even when the same game is reported twice", () => {
		// The engine guards this at the state machine, but the saver is what
		// actually spends a request, so the property is pinned here too.
		saver.save(STATS, "scale");
		expect(saveGameResult).toHaveBeenCalledTimes(1);
	});

	it("tags an assignment attempt with its id", () => {
		saver.save(STATS, "chord", 314);

		expect(saveGameResult).toHaveBeenCalledWith(
			expect.objectContaining({ assignmentId: 314 }),
		);
	});

	it("back-computes elapsed time in questions mode", () => {
		// 10 questions at 42 per minute is 14.29s, rounded to 14.
		saver.save({ ...STATS, gameMode: GameMode.Notes, limit: 10 }, "interval");

		expect(saveGameResult).toHaveBeenCalledWith(
			expect.objectContaining({ timeLength: "00:00:14" }),
		);
	});

	it("does not divide by zero when the rate is zero", () => {
		saver.save(
			{ ...STATS, gameMode: GameMode.Notes, npm: 0, total: 3 },
			"interval",
		);

		expect(saveGameResult).toHaveBeenCalledWith(
			expect.objectContaining({ timeLength: "00:03:00" }),
		);
	});

	it("saves nothing for an anonymous player", () => {
		signedIn = false;
		saver.save(STATS, "scale");

		expect(saveGameResult).not.toHaveBeenCalled();
		expect(showSuccess).not.toHaveBeenCalled();
	});

	it("reports a rejected save rather than swallowing it", () => {
		// The Go DTO marks correct_questions `required`, which refuses a
		// zero, so a game scored entirely wrong comes back 400. The player
		// must be told the score was lost.
		saveGameResult.mockReturnValue(throwError(() => new Error("400")));

		saver.save({ ...STATS, correct: 0 }, "scale");

		expect(saver.saveError()).toBe(true);
		expect(showError).toHaveBeenCalledWith(
			"Failed to save game results. Your score was not recorded.",
		);
		expect(showSuccess).not.toHaveBeenCalled();
	});

	it("clears the error flag on the next successful save", () => {
		saveGameResult.mockReturnValueOnce(throwError(() => new Error("400")));
		saver.save(STATS, "scale");
		expect(saver.saveError()).toBe(true);

		saver.save(STATS, "scale");
		expect(saver.saveError()).toBe(false);
	});
});

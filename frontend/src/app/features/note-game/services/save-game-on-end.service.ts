import { inject, Injectable, signal } from "@angular/core";

import { AuthStore } from "../../../auth/services/auth.store";
import { NotificationService } from "../../../core/services/notification.service";
import type { GameType } from "../../../shared/models/game.models";
import { UserService } from "../../../shared/services/user.service";
import type { GameStats } from "../models/engine.models";
import { formatTimeLength, GameMode } from "../models/engine.models";

/**
 * PHASE-5 SEAM. Port of
 * `features/identification-game/hooks/useSaveGameOnEnd.ts`.
 *
 * Persists a finished game as a score entry, with the two toasts the E2E
 * harness reads (`e2e/support/app.ts`, `expectScoreOutcomeReported`). No-op
 * for anonymous players -- there is no account to save to, and the results
 * screen offers a sign-up link instead.
 *
 * **Save-once is this class's contract.** `handleGameEnd` is wired to the
 * engine's `onGameEnd`, which fires exactly once per game because
 * `IdentificationGameEngine.endGame` is idempotent; `saving` additionally
 * refuses a concurrent second POST, so neither a double timer expiry nor a
 * stray re-entry can post twice. Both halves are pinned in the spec.
 *
 * Not ported: React invalidated the student's assignment list through
 * `queryClient.invalidateQueries` after an assignment attempt. There is no
 * query cache (D6) -- the assignments page refetches on load -- so there is
 * nothing to invalidate.
 */
@Injectable()
export class SaveGameOnEndService {
	private readonly users = inject(UserService);
	private readonly auth = inject(AuthStore);
	private readonly notifications = inject(NotificationService);

	private readonly _saveError = signal(false);
	private saving = false;

	/** True when the last save failed; the results screen says so. */
	readonly saveError = this._saveError.asReadonly();

	handleGameEnd(
		stats: GameStats,
		gameType: GameType,
		assignmentId?: number,
	): void {
		const user = this.auth.user();
		if (!this.auth.isAuthenticated() || !user) return;
		if (this.saving) return;
		this.saving = true;

		// Notes mode has no clock, so the elapsed time is reconstructed from
		// the rate the engine already computed. React's arithmetic, verbatim.
		const timeInSeconds =
			stats.gameMode === GameMode.Time
				? stats.limit
				: Math.round((stats.total / Math.max(stats.npm, 1)) * 60);

		this.users
			.saveGameResult({
				timeLength: formatTimeLength(timeInSeconds),
				totalQuestions: stats.total,
				correctQuestions: stats.correct,
				userId: user.id,
				notesPerMinute: stats.npm,
				gameType,
				assignmentId,
			})
			.subscribe({
				next: () => {
					this.saving = false;
					this._saveError.set(false);
					this.notifications.showSuccess("Game results saved successfully!");
				},
				error: () => {
					this.saving = false;
					this._saveError.set(true);
					this.notifications.showError(
						"Failed to save game results. Your score was not recorded.",
					);
				},
			});
	}

	/** Clears the last failure when the player starts a new game. */
	reset(): void {
		this._saveError.set(false);
	}
}

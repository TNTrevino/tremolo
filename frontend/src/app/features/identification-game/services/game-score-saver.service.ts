import { inject, Injectable, signal } from "@angular/core";

import { NotificationService } from "@core/services/notification.service";
import { AuthStore } from "../../../auth/services/auth.store";
import type { GameType } from "@shared/models/game.models";
import { UserService } from "@shared/services/user.service";

import { formatTimeLength } from "../game.utils";
import { GameMode, type GameStats } from "../models/game-state.models";

/**
 * Persists a finished game as a score entry, with the two toasts.
 *
 * Port of
 * frontend-react/src/features/identification-game/hooks/useSaveGameOnEnd.ts.
 * Shared by the identification shell and (Phase 6) the note game page. A
 * no-op for anonymous players -- all five game routes are public, and
 * playing signed out is deliberate.
 *
 * What React's TanStack cache invalidation did has no port: `rxResource`
 * does not cache (D6), so the dashboard and the student's assignment list
 * refetch on their next load without being told. That is the policy
 * working, not a dropped feature.
 *
 * Root-provided: it holds no per-game state beyond the last save's outcome,
 * which the results screen reads.
 */
@Injectable({ providedIn: "root" })
export class GameScoreSaverService {
	private readonly authStore = inject(AuthStore);
	private readonly notifications = inject(NotificationService);
	private readonly users = inject(UserService);

	private readonly _saveError = signal(false);

	/** True when the last attempted save failed. Results screens read it. */
	readonly saveError = this._saveError.asReadonly();

	/**
	 * Saves a finished game.
	 *
	 * `timeInSeconds` is React's arithmetic unchanged: a timed game reports
	 * its limit, a questions game back-computes elapsed time from the rate.
	 * `Math.max(npm, 1)` is what keeps a zero-rate game from dividing by
	 * zero.
	 */
	save(stats: GameStats, gameType: GameType, assignmentId?: number): void {
		const user = this.authStore.user();
		if (!this.authStore.isAuthenticated() || !user) return;

		const timeInSeconds =
			stats.gameMode === GameMode.Time
				? stats.limit
				: Math.round((stats.total / Math.max(stats.npm, 1)) * 60);

		this._saveError.set(false);

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
					this.notifications.showSuccess("Game results saved successfully!");
				},
				error: () => {
					this._saveError.set(true);
					this.notifications.showError(
						"Failed to save game results. Your score was not recorded.",
					);
				},
			});
	}
}

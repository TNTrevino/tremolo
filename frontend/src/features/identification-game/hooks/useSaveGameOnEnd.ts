import { useCallback } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { useToast } from "@/shared/hooks/useToast";
import { useSaveGameResult } from "@/shared/hooks/queries";
import type { GameType } from "@/services/api/types";
import type { GameStats } from "../types";
import { GameMode } from "../types";
import { formatTimeLength } from "../utils";

/**
 * Persists a finished game's stats as a score entry (with toasts),
 * shared by the note game page and the identification game shell.
 * Returns a stable onGameEnd handler plus the save-error flag for
 * results screens. No-op for anonymous players.
 */
export function useSaveGameOnEnd(gameType: GameType) {
	const { isAuthenticated, user } = useAuthStore();
	const { showSuccess, showError } = useToast();
	const saveResult = useSaveGameResult();
	const { mutate } = saveResult;

	const handleGameEnd = useCallback(
		(stats: GameStats) => {
			if (!isAuthenticated || !user) return;

			const timeInSeconds =
				stats.gameMode === GameMode.Time
					? stats.limit
					: Math.round((stats.total / Math.max(stats.npm, 1)) * 60);

			mutate(
				{
					timeLength: formatTimeLength(timeInSeconds),
					totalQuestions: stats.total,
					correctQuestions: stats.correct,
					userId: user.id,
					notesPerMinute: stats.npm,
					gameType,
				},
				{
					onSuccess: () => {
						showSuccess("Game results saved successfully!");
					},
					onError: () => {
						showError(
							"Failed to save game results. Your score was not recorded.",
						);
					},
				},
			);
		},
		[isAuthenticated, user, gameType, mutate, showSuccess, showError],
	);

	return { handleGameEnd, saveError: saveResult.isError };
}

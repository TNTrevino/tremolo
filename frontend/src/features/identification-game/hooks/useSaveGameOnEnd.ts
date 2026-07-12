import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth.store";
import { useToast } from "@/shared/hooks/useToast";
import { useSaveGameResult, classesKeys } from "@/shared/hooks/queries";
import type { GameType } from "@/services/api/types";
import type { GameStats } from "../types";
import { GameMode } from "../types";
import { formatTimeLength } from "../utils";

/**
 * Persists a finished game's stats as a score entry (with toasts),
 * shared by the note game page and the identification game shell.
 * Returns a stable onGameEnd handler plus the save-error flag for
 * results screens. No-op for anonymous players.
 *
 * When an `assignmentId` is supplied the entry is tagged as an
 * assignment attempt and the student's assignment progress list is
 * invalidated on success so it reflects the new attempt.
 */
export function useSaveGameOnEnd(gameType: GameType, assignmentId?: number) {
	const { isAuthenticated, user } = useAuthStore();
	const { showSuccess, showError } = useToast();
	const queryClient = useQueryClient();
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
					assignmentId,
				},
				{
					onSuccess: () => {
						showSuccess("Game results saved successfully!");
						if (assignmentId !== undefined) {
							queryClient.invalidateQueries({
								queryKey: classesKeys.studentAssignments(),
							});
						}
					},
					onError: () => {
						showError(
							"Failed to save game results. Your score was not recorded.",
						);
					},
				},
			);
		},
		[
			isAuthenticated,
			user,
			gameType,
			assignmentId,
			mutate,
			queryClient,
			showSuccess,
			showError,
		],
	);

	return { handleGameEnd, saveError: saveResult.isError };
}

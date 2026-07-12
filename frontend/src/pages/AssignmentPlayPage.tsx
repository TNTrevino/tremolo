import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import {
	IdentificationGamePage,
	keySignatureGame,
	scaleGame,
	chordGame,
	intervalGame,
	type BaseGameSettings,
	type GeneratedQuestion,
} from "@/features/identification-game";
import type { GameDefinition } from "@/features/identification-game/games/types";
import { NoteGamePage } from "@/pages/NoteGamePage";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Button } from "@/shared/components/ui/button";
import { useStudentAssignments } from "@/shared/hooks/queries";
import type { StudentAssignment } from "@/features/classes/types";

/** A game definition with its specifics erased for uniform storage/rendering. */
type AnyGameDefinition = GameDefinition<
	GeneratedQuestion,
	BaseGameSettings,
	unknown
>;

/**
 * Lookup from a generic game type to its declarative definition. The
 * note game is intentionally absent — it renders through NoteGamePage,
 * not the identification shell.
 */
export const GENERIC_GAME_DEFINITIONS: Record<string, AnyGameDefinition> = {
	key_signature: keySignatureGame as unknown as AnyGameDefinition,
	scale: scaleGame as unknown as AnyGameDefinition,
	chord: chordGame as unknown as AnyGameDefinition,
	interval: intervalGame as unknown as AnyGameDefinition,
};

function BackLink() {
	return (
		<Link
			to="/assignments"
			className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
		>
			<ArrowLeft className="h-4 w-4" />
			Back to assignments
		</Link>
	);
}

function NotFound() {
	return (
		<div className="min-h-screen px-4 py-8">
			<div className="container mx-auto max-w-3xl space-y-4">
				<h1 className="font-display text-2xl font-bold">
					Assignment not found
				</h1>
				<p className="text-sm text-muted-foreground">
					This assignment doesn&apos;t exist or is no longer assigned to you.
				</p>
				<Link to="/assignments">
					<Button variant="default">Back to assignments</Button>
				</Link>
			</div>
		</div>
	);
}

/**
 * Launches an assignment in "assignment mode": the game is configured
 * from the assignment's frozen config (not the student's personal
 * settings), and on completion the score entry is tagged with the
 * assignment id (see IdentificationGamePage / NoteGamePage).
 *
 * There's no direct GET-by-id endpoint, so we find the assignment in
 * the student's assignment list.
 */
export function AssignmentPlayPage() {
	const { id } = useParams<{ id: string }>();
	const assignmentId = Number(id);
	const { data: assignments, isLoading } = useStudentAssignments();

	if (isLoading) {
		return (
			<div className="min-h-screen px-4 py-8">
				<div className="container mx-auto max-w-3xl space-y-4">
					<Skeleton className="h-6 w-40" />
					<Skeleton className="h-64 w-full" />
				</div>
			</div>
		);
	}

	const assignment: StudentAssignment | undefined = assignments?.find(
		(a) => a.id === assignmentId,
	);

	if (!assignment) {
		return <NotFound />;
	}

	const gameConfig = { id: assignment.id, config: assignment.config };

	if (assignment.gameType === "note") {
		return (
			<div className="flex h-[calc(100vh-4rem)] flex-col">
				<div className="px-4 pt-2 sm:px-6">
					<BackLink />
				</div>
				<div className="min-h-0 flex-1">
					<NoteGamePage assignment={gameConfig} />
				</div>
			</div>
		);
	}

	const definition = GENERIC_GAME_DEFINITIONS[assignment.gameType];

	if (!definition) {
		return <NotFound />;
	}

	return (
		<div className="flex h-[calc(100vh-4rem)] flex-col">
			<div className="px-4 pt-2 sm:px-6">
				<BackLink />
			</div>
			<div className="min-h-0 flex-1">
				<IdentificationGamePage
					definition={definition}
					assignment={gameConfig}
				/>
			</div>
		</div>
	);
}

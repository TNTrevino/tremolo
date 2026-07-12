import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";

export interface AnswerOption {
	/** Value passed to onAnswer (must match the backend answer field) */
	value: string;
	/** Text shown on the button (defaults to value) */
	label?: string;
	/** Button style (defaults to "outline"; "secondary" marks naturals) */
	variant?: "default" | "outline" | "secondary";
}

export interface AnswerPadProps {
	options: AnswerOption[];
	onAnswer: (answer: string) => void;
	/** Tailwind grid-cols-* class, e.g. "grid-cols-4" */
	columnsClassName?: string;
}

/**
 * Generic answer button grid for identification games.
 * The note game keeps its own three-row NoteButtonGrid; this pad covers
 * key signature / scale / chord answer layouts.
 */
export function AnswerPad({
	options,
	onAnswer,
	columnsClassName = "grid-cols-2",
}: AnswerPadProps) {
	return (
		<Card className="flex-shrink-0 p-2 sm:p-4">
			<div className={`grid ${columnsClassName} gap-1.5 sm:gap-2`}>
				{options.map((option) => (
					<Button
						key={option.value}
						variant={option.variant ?? "outline"}
						onClick={() => onAnswer(option.value)}
						className="h-11 sm:h-16 text-xs sm:text-lg font-bold px-0 sm:px-2"
					>
						{option.label ?? option.value}
					</Button>
				))}
			</div>
		</Card>
	);
}

import { Button } from "@/shared/components/ui/button";
import { Select } from "@/shared/components/ui/select";
import type { BaseGameSettings } from "../types";
import { GameMode, TIME_LIMITS, NOTE_LIMITS } from "../types";

export interface GameModeLimitControlsProps<S extends BaseGameSettings> {
	settings: S;
	onChange: (settings: Partial<S>) => void;
	/** Unit word for count mode ("questions", "notes") */
	unit?: string;
}

const formatTimeLimit = (limit: number) =>
	limit >= 60
		? `${limit / 60} minute${limit > 60 ? "s" : ""}`
		: `${limit} seconds`;

/**
 * The two settings every game shares: mode (time vs question count)
 * and the matching limit. Rendered above the game's own
 * SettingsControls in the settings dialog.
 */
export function GameModeLimitControls<S extends BaseGameSettings>({
	settings,
	onChange,
	unit = "questions",
}: GameModeLimitControlsProps<S>) {
	const isTimeMode = settings.gameMode === GameMode.Time;
	const unitLabel = unit.charAt(0).toUpperCase() + unit.slice(1);

	return (
		<>
			<div className="space-y-1">
				<label htmlFor="game-mode" className="text-xs font-medium">
					Mode
				</label>
				<div className="flex gap-1.5" id="game-mode" role="group">
					<Button
						size="sm"
						variant={isTimeMode ? "default" : "outline"}
						onClick={() => onChange({ gameMode: GameMode.Time } as Partial<S>)}
					>
						Time
					</Button>
					<Button
						size="sm"
						variant={!isTimeMode ? "default" : "outline"}
						onClick={() => onChange({ gameMode: GameMode.Notes } as Partial<S>)}
					>
						{unitLabel}
					</Button>
				</div>
			</div>

			<div className="space-y-1">
				<label htmlFor="limit-selector" className="text-xs font-medium">
					{isTimeMode ? "Time Limit" : unitLabel}
				</label>
				{isTimeMode ? (
					<Select
						id="limit-selector"
						value={settings.timeLimit.toString()}
						onChange={(e) =>
							onChange({ timeLimit: Number(e.target.value) } as Partial<S>)
						}
					>
						{TIME_LIMITS.map((limit) => (
							<option key={limit} value={limit}>
								{formatTimeLimit(limit)}
							</option>
						))}
					</Select>
				) : (
					<Select
						id="limit-selector"
						value={settings.noteLimit.toString()}
						onChange={(e) =>
							onChange({ noteLimit: Number(e.target.value) } as Partial<S>)
						}
					>
						{NOTE_LIMITS.map((limit) => (
							<option key={limit} value={limit}>
								{limit} {unit}
							</option>
						))}
					</Select>
				)}
			</div>
		</>
	);
}

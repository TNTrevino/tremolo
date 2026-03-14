import { Button } from "@/shared/components/ui/button";
import { Select } from "@/shared/components/ui/select";
import type { GameSettings as GameSettingsType } from "../types";
import { GameMode, SCALES } from "../types";

export interface SettingsBarProps {
	settings: GameSettingsType;
	onSettingsChange: (settings: Partial<GameSettingsType>) => void;
}

const TIME_LIMITS = [15, 30, 60, 120] as const;
const NOTE_LIMITS = [10, 25, 50, 100] as const;
const OCTAVES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function Divider() {
	return <div className="hidden md:block w-px bg-border self-stretch" />;
}

/**
 * Compact horizontal settings bar inspired by Monkeytype.
 * Single row on md+ screens, wraps into grouped rows on smaller screens.
 */
export function SettingsBar({ settings, onSettingsChange }: SettingsBarProps) {
	const isTimeMode = settings.gameMode === GameMode.Time;
	const limits = isTimeMode ? TIME_LIMITS : NOTE_LIMITS;
	const activeLimit = isTimeMode ? settings.timeLimit : settings.noteLimit;

	return (
		<div className="flex flex-wrap items-center gap-2 md:gap-3 bg-card border-2 border-border rounded-lg px-3 md:px-4 py-2">
			{/* Game Mode Toggle */}
			<div className="flex items-center gap-1">
				<Button
					size="sm"
					variant={isTimeMode ? "default" : "ghost"}
					onClick={() => onSettingsChange({ gameMode: GameMode.Time })}
				>
					time
				</Button>
				<Button
					size="sm"
					variant={!isTimeMode ? "default" : "ghost"}
					onClick={() => onSettingsChange({ gameMode: GameMode.Notes })}
				>
					notes
				</Button>
			</div>

			<Divider />

			{/* Limit Selector */}
			<div className="flex items-center gap-1">
				{limits.map((limit) => (
					<Button
						key={limit}
						size="sm"
						variant={activeLimit === limit ? "default" : "ghost"}
						onClick={() =>
							onSettingsChange(
								isTimeMode ? { timeLimit: limit } : { noteLimit: limit },
							)
						}
					>
						{limit}
					</Button>
				))}
			</div>

			<Divider />

			{/* Dropdowns grouped together so they wrap as a pair */}
			<div className="flex items-center gap-2 [&>div]:w-auto">
				<Select
					className="w-28 h-9"
					value={settings.scale}
					onChange={(e) => onSettingsChange({ scale: e.target.value })}
				>
					{SCALES.map((scale) => (
						<option key={scale} value={scale}>
							{scale}
						</option>
					))}
				</Select>

				<Select
					className="w-28 h-9"
					value={settings.octave.toString()}
					onChange={(e) => onSettingsChange({ octave: Number(e.target.value) })}
				>
					{OCTAVES.map((octave) => (
						<option key={octave} value={octave}>
							Octave {octave}
						</option>
					))}
				</Select>
			</div>
		</div>
	);
}

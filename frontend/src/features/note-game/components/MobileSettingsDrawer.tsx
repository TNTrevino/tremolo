import { useEffect } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Select } from "@/shared/components/ui/select";
import type { GameSettings as GameSettingsType } from "../types";
import { GameMode, SCALES } from "../types";

export interface MobileSettingsDrawerProps {
	settings: GameSettingsType;
	onSettingsChange: (settings: Partial<GameSettingsType>) => void;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const TIME_LIMITS = [15, 30, 60, 120] as const;
const NOTE_LIMITS = [10, 25, 50, 100] as const;
const OCTAVES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/**
 * Full-screen bottom drawer for mobile game settings.
 * Slides up from the bottom with a backdrop overlay.
 * Inspired by Monkeytype's vertical settings panel.
 */
export function MobileSettingsDrawer({
	settings,
	onSettingsChange,
	open,
	onOpenChange,
}: MobileSettingsDrawerProps) {
	const isTimeMode = settings.gameMode === GameMode.Time;
	const limits = isTimeMode ? TIME_LIMITS : NOTE_LIMITS;
	const activeLimit = isTimeMode ? settings.timeLimit : settings.noteLimit;

	useEffect(() => {
		if (open) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [open]);

	return (
		<>
			{/* Backdrop */}
			<div
				className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${
					open ? "opacity-100" : "opacity-0 pointer-events-none"
				}`}
				onClick={() => onOpenChange(false)}
			/>

			{/* Drawer */}
			<div
				className={`fixed inset-x-0 bottom-0 z-50 bg-card border-t-2 border-border rounded-t-2xl transition-transform duration-300 ease-out ${
					open ? "translate-y-0" : "translate-y-full"
				}`}
			>
				{/* Drag handle */}
				<div className="flex justify-center pt-3 pb-2">
					<div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
				</div>

				<div className="px-5 pb-6 space-y-5 max-h-[80vh] overflow-y-auto">
					{/* Header */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2 text-lg font-semibold">
							<Settings className="h-5 w-5 text-muted-foreground" />
							Game Settings
						</div>
						<Button
							size="sm"
							variant="ghost"
							onClick={() => onOpenChange(false)}
						>
							Done
						</Button>
					</div>

					{/* Game Mode */}
					<div className="space-y-2">
						<label className="text-sm font-medium text-muted-foreground">
							Mode
						</label>
						<div className="grid grid-cols-2 gap-2">
							<Button
								variant={isTimeMode ? "default" : "outline"}
								className="h-11"
								onClick={() => onSettingsChange({ gameMode: GameMode.Time })}
							>
								time
							</Button>
							<Button
								variant={!isTimeMode ? "default" : "outline"}
								className="h-11"
								onClick={() => onSettingsChange({ gameMode: GameMode.Notes })}
							>
								notes
							</Button>
						</div>
					</div>

					{/* Limit */}
					<div className="space-y-2">
						<label className="text-sm font-medium text-muted-foreground">
							{isTimeMode ? "Time Limit" : "Note Limit"}
						</label>
						<div className="grid grid-cols-4 gap-2">
							{limits.map((limit) => (
								<Button
									key={limit}
									variant={activeLimit === limit ? "default" : "outline"}
									className="h-11"
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
					</div>

					{/* Scale */}
					<div className="space-y-2">
						<label className="text-sm font-medium text-muted-foreground">
							Scale
						</label>
						<Select
							className="h-11"
							value={settings.scale}
							onChange={(e) => onSettingsChange({ scale: e.target.value })}
						>
							{SCALES.map((scale) => (
								<option key={scale} value={scale}>
									{scale}
								</option>
							))}
						</Select>
					</div>

					{/* Octave */}
					<div className="space-y-2">
						<label className="text-sm font-medium text-muted-foreground">
							Octave
						</label>
						<Select
							className="h-11"
							value={settings.octave.toString()}
							onChange={(e) =>
								onSettingsChange({ octave: Number(e.target.value) })
							}
						>
							{OCTAVES.map((octave) => (
								<option key={octave} value={octave}>
									Octave {octave}
								</option>
							))}
						</Select>
					</div>
				</div>
			</div>
		</>
	);
}

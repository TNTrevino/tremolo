import { useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Select } from "@/shared/components/ui/select";
import { useBreakpoint } from "@/shared/hooks";
import type { GameSettings as GameSettingsType } from "../types";
import { GameMode, SCALES } from "../types";
import { MobileSettingsDrawer } from "./MobileSettingsDrawer";

export interface SettingsBarProps {
	settings: GameSettingsType;
	onSettingsChange: (settings: Partial<GameSettingsType>) => void;
}

const TIME_LIMITS = [15, 30, 60, 120] as const;
const NOTE_LIMITS = [10, 25, 50, 100] as const;
const OCTAVES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function Divider() {
	return <div className="w-px bg-border self-stretch" />;
}

function buildSummaryParts(settings: GameSettingsType): string[] {
	const isTimeMode = settings.gameMode === GameMode.Time;
	const activeLimit = isTimeMode ? settings.timeLimit : settings.noteLimit;
	return [
		isTimeMode ? "time" : "notes",
		isTimeMode ? `${activeLimit}s` : `${activeLimit}`,
		settings.scale,
		`Oct ${settings.octave}`,
	];
}

function SettingsBarMobile({ settings, onSettingsChange }: SettingsBarProps) {
	const [drawerOpen, setDrawerOpen] = useState(false);
	const summaryText = buildSummaryParts(settings).join("  /  ");

	return (
		<>
			<div
				className="flex items-center justify-between bg-card border-2 border-border rounded-lg px-3 py-1.5 cursor-pointer"
				onClick={() => setDrawerOpen(true)}
			>
				<span className="text-sm text-muted-foreground truncate">
					{summaryText}
				</span>
				<Button
					size="sm"
					variant="ghost"
					className="flex-shrink-0 ml-2"
					onClick={(e) => {
						e.stopPropagation();
						setDrawerOpen(true);
					}}
				>
					<Settings className="h-4 w-4" />
				</Button>
			</div>
			<MobileSettingsDrawer
				settings={settings}
				onSettingsChange={onSettingsChange}
				open={drawerOpen}
				onOpenChange={setDrawerOpen}
			/>
		</>
	);
}

function SettingsBarLandscape({
	settings,
	onSettingsChange,
}: SettingsBarProps) {
	const [drawerOpen, setDrawerOpen] = useState(false);
	const summaryParts = buildSummaryParts(settings);

	return (
		<>
			<div
				className="flex flex-col items-center justify-center gap-1 bg-card border-2 border-border rounded-lg px-2 py-2 cursor-pointer w-full h-full"
				onClick={() => setDrawerOpen(true)}
			>
				{summaryParts.map((part) => (
					<span
						key={part}
						className="text-xs text-muted-foreground text-center"
					>
						{part}
					</span>
				))}
				<Settings className="h-3.5 w-3.5 text-muted-foreground mt-1" />
			</div>
			<MobileSettingsDrawer
				settings={settings}
				onSettingsChange={onSettingsChange}
				open={drawerOpen}
				onOpenChange={setDrawerOpen}
			/>
		</>
	);
}

function SettingsBarDesktop({ settings, onSettingsChange }: SettingsBarProps) {
	const isTimeMode = settings.gameMode === GameMode.Time;
	const limits = isTimeMode ? TIME_LIMITS : NOTE_LIMITS;
	const activeLimit = isTimeMode ? settings.timeLimit : settings.noteLimit;

	return (
		<div className="flex flex-wrap items-center gap-2 md:gap-3 bg-card border-2 border-border rounded-lg px-3 md:px-4 py-2">
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

/**
 * Responsive settings bar.
 * Conditionally renders the appropriate layout variant based on viewport,
 * so only one is ever mounted at a time.
 */
export function SettingsBar({ settings, onSettingsChange }: SettingsBarProps) {
	const { isMobile, isPhoneLandscape } = useBreakpoint();

	if (isPhoneLandscape) {
		return (
			<SettingsBarLandscape
				settings={settings}
				onSettingsChange={onSettingsChange}
			/>
		);
	}

	if (isMobile) {
		return (
			<SettingsBarMobile
				settings={settings}
				onSettingsChange={onSettingsChange}
			/>
		);
	}

	return (
		<SettingsBarDesktop
			settings={settings}
			onSettingsChange={onSettingsChange}
		/>
	);
}

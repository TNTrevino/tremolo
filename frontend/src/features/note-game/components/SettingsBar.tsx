import { useState } from "react";
import { Keyboard, Settings } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Select } from "@/shared/components/ui/select";
import { useBreakpoint } from "@/shared/hooks";
import { useAuthStore } from "@/stores/auth.store";
import {
	useKeyboardBindings,
	useSaveKeyboardBindings,
} from "@/shared/hooks/queries";
import type { GameSettings as GameSettingsType } from "../types";
import { GameMode, SCALES } from "../types";
import { MobileSettingsDrawer } from "./MobileSettingsDrawer";
import { KeyboardBindingsDialog } from "./KeyboardBindingsDialog";
import { DEFAULT_NOTE_TO_KEY_MAP } from "../hooks/useKeyboardInput";
import type { KeyboardBindingsRequest } from "@/services/api/types";

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
			<button
				type="button"
				className="flex items-center justify-between bg-card border-2 border-border rounded-lg px-3 py-1.5 cursor-pointer w-full text-left"
				onClick={() => setDrawerOpen(true)}
			>
				<span className="text-sm text-muted-foreground truncate">
					{summaryText}
				</span>
				<span className="flex-shrink-0 ml-2 p-1">
					<Settings className="h-4 w-4 text-muted-foreground" />
				</span>
			</button>
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
			<button
				type="button"
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
			</button>
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
	const { isAuthenticated } = useAuthStore();
	const { data: savedBindings } = useKeyboardBindings();
	const saveBindings = useSaveKeyboardBindings();
	const [dialogOpen, setDialogOpen] = useState(false);

	function handleSaveBindings(noteToKey: Record<string, string>) {
		const request: KeyboardBindingsRequest = {
			key_c: noteToKey["C"] ?? "",
			key_c_sharp: noteToKey["C#"] ?? "",
			key_c_flat: noteToKey["Cb"] ?? "",
			key_d: noteToKey["D"] ?? "",
			key_d_sharp: noteToKey["D#"] ?? "",
			key_d_flat: noteToKey["Db"] ?? "",
			key_e: noteToKey["E"] ?? "",
			key_e_sharp: noteToKey["E#"] ?? "",
			key_e_flat: noteToKey["Eb"] ?? "",
			key_f: noteToKey["F"] ?? "",
			key_f_sharp: noteToKey["F#"] ?? "",
			key_f_flat: noteToKey["Fb"] ?? "",
			key_g: noteToKey["G"] ?? "",
			key_g_sharp: noteToKey["G#"] ?? "",
			key_g_flat: noteToKey["Gb"] ?? "",
			key_a: noteToKey["A"] ?? "",
			key_a_sharp: noteToKey["A#"] ?? "",
			key_a_flat: noteToKey["Ab"] ?? "",
			key_b: noteToKey["B"] ?? "",
			key_b_sharp: noteToKey["B#"] ?? "",
			key_b_flat: noteToKey["Bb"] ?? "",
		};
		saveBindings.mutate(request);
	}

	function apiResponseToNoteMap(): Record<string, string> {
		if (!savedBindings) return DEFAULT_NOTE_TO_KEY_MAP;
		return {
			C: savedBindings.key_c,
			"C#": savedBindings.key_c_sharp,
			Cb: savedBindings.key_c_flat,
			D: savedBindings.key_d,
			"D#": savedBindings.key_d_sharp,
			Db: savedBindings.key_d_flat,
			E: savedBindings.key_e,
			"E#": savedBindings.key_e_sharp,
			Eb: savedBindings.key_e_flat,
			F: savedBindings.key_f,
			"F#": savedBindings.key_f_sharp,
			Fb: savedBindings.key_f_flat,
			G: savedBindings.key_g,
			"G#": savedBindings.key_g_sharp,
			Gb: savedBindings.key_g_flat,
			A: savedBindings.key_a,
			"A#": savedBindings.key_a_sharp,
			Ab: savedBindings.key_a_flat,
			B: savedBindings.key_b,
			"B#": savedBindings.key_b_sharp,
			Bb: savedBindings.key_b_flat,
		};
	}

	let variant: React.ReactNode;

	if (isPhoneLandscape) {
		variant = (
			<SettingsBarLandscape
				settings={settings}
				onSettingsChange={onSettingsChange}
			/>
		);
	} else if (isMobile) {
		variant = (
			<SettingsBarMobile
				settings={settings}
				onSettingsChange={onSettingsChange}
			/>
		);
	} else {
		variant = (
			<SettingsBarDesktop
				settings={settings}
				onSettingsChange={onSettingsChange}
			/>
		);
	}

	return (
		<>
			{variant}
			{isAuthenticated && (
				<>
					<button
						type="button"
						onClick={() => setDialogOpen(true)}
						className="fixed bottom-4 right-4 z-40 p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
						aria-label="Configure keyboard bindings"
					>
						<Keyboard className="h-5 w-5" />
					</button>
					<KeyboardBindingsDialog
						open={dialogOpen}
						onOpenChange={setDialogOpen}
						bindings={apiResponseToNoteMap()}
						onSave={handleSaveBindings}
					/>
				</>
			)}
		</>
	);
}

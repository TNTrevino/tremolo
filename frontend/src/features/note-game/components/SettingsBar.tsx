import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Keyboard, Settings } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Select } from "@/shared/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/shared/components/ui/dialog";
import { useBreakpoint } from "@/shared/hooks";
import { useAuthStore } from "@/stores/auth.store";
import {
	useKeyboardBindings,
	useSaveKeyboardBindings,
} from "@/shared/hooks/queries";
import type { GameSettings as GameSettingsType } from "../types";
import { GameMode, SCALES } from "../types";
import { TIME_LIMITS, NOTE_LIMITS } from "@/features/identification-game";
import { MobileSettingsDrawer } from "./MobileSettingsDrawer";
import { NoteRangeSetting } from "./NoteRangeSetting";
import { KeyboardBindingsDialog } from "./KeyboardBindingsDialog";
import { DEFAULT_NOTE_TO_KEY_MAP } from "../hooks/useKeyboardInput";
import { keyBindingsToNoteMap } from "../utils";
import type { KeyboardBindingsRequest } from "@/services/api/types";

export interface SettingsBarProps {
	settings: GameSettingsType;
	onSettingsChange: (settings: Partial<GameSettingsType>) => void;
	onDialogOpenChange?: (open: boolean) => void;
}

interface KeyboardUpsellDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

function KeyboardUpsellDialog({
	open,
	onOpenChange,
}: KeyboardUpsellDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Customize Keyboard Input</DialogTitle>
				</DialogHeader>
				<div className="px-6 py-4 space-y-3">
					<p className="text-base text-muted-foreground">
						Create an account to configure your own keyboard bindings for all 21
						notes and have them saved across sessions.
					</p>
				</div>
				<DialogFooter>
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Link to="/signup">
						<Button variant="default">Create Account</Button>
					</Link>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

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
		`${settings.lowNote}\u2013${settings.highNote}`,
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
	const [rangeDialogOpen, setRangeDialogOpen] = useState(false);

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

				<Button
					size="sm"
					variant="outline"
					className="h-9"
					onClick={() => setRangeDialogOpen(true)}
				>
					{settings.lowNote}–{settings.highNote}
				</Button>

				<Dialog open={rangeDialogOpen} onOpenChange={setRangeDialogOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Note Range</DialogTitle>
						</DialogHeader>
						<div className="px-6 py-4">
							<NoteRangeSetting
								settings={settings}
								onSettingsChange={onSettingsChange}
							/>
						</div>
						<DialogFooter>
							<Button
								variant="default"
								onClick={() => setRangeDialogOpen(false)}
							>
								Done
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>
		</div>
	);
}

/**
 * Responsive settings bar.
 * Conditionally renders the appropriate layout variant based on viewport,
 * so only one is ever mounted at a time.
 */
export function SettingsBar({
	settings,
	onSettingsChange,
	onDialogOpenChange,
}: SettingsBarProps) {
	const { isMobile, isPhoneLandscape } = useBreakpoint();
	const { isAuthenticated } = useAuthStore();
	const { data: savedBindings } = useKeyboardBindings();
	const saveBindings = useSaveKeyboardBindings();
	const [dialogOpen, setDialogOpen] = useState(false);

	function handleDialogOpenChange(open: boolean) {
		setDialogOpen(open);
		onDialogOpenChange?.(open);
	}

	function handleSaveBindings(noteToKey: Record<string, string>) {
		const request: KeyboardBindingsRequest = {
			key_bindings: {
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
			},
		};
		saveBindings.mutate(request);
	}

	const currentBindings = useMemo(
		() =>
			savedBindings
				? keyBindingsToNoteMap(savedBindings.key_bindings)
				: DEFAULT_NOTE_TO_KEY_MAP,
		[savedBindings],
	);

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
			<button
				type="button"
				onClick={() => handleDialogOpenChange(true)}
				className="fixed bottom-4 right-4 z-40 p-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
				aria-label="Configure keyboard bindings"
			>
				<Keyboard className="h-5 w-5" />
			</button>
			{isAuthenticated ? (
				<KeyboardBindingsDialog
					open={dialogOpen}
					onOpenChange={handleDialogOpenChange}
					bindings={currentBindings}
					onSave={handleSaveBindings}
				/>
			) : (
				<KeyboardUpsellDialog
					open={dialogOpen}
					onOpenChange={handleDialogOpenChange}
				/>
			)}
		</>
	);
}

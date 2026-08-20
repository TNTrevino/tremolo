import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select } from "@/shared/components/ui/select";
import { FormField } from "@/shared/components/forms/FormField";
import {
	SettingsControls,
	GameModeLimitControls,
	CLEF_LABELS,
	TIME_LIMITS,
	NOTE_LIMITS,
	type BaseGameSettings,
	type SettingDescriptor,
} from "@/features/identification-game";
import { SCALES } from "@/features/note-game";
import { StaffRangePicker } from "@/features/note-game/components/StaffRangePicker";
import { DEFAULT_RANGE } from "@/features/note-game/rangeUtils";
import { useCreateAssignment } from "@/shared/hooks/queries";
import {
	GENERIC_GAME_DEFINITIONS as GENERIC_GAMES,
	GAME_TYPE_OPTIONS,
	type GenericGameType,
} from "@/features/classes/gameDefinitions";
import type {
	CreateAssignmentRequest,
	GameType,
	NoteGameSettingsRequest,
} from "@/services/api/types";

// Mirrors the note game's own default settings (see useNoteGame).
const NOTE_DEFAULTS: NoteGameSettingsRequest = {
	low_note: DEFAULT_RANGE.treble.low,
	high_note: DEFAULT_RANGE.treble.high,
	clef: "treble",
	game_mode: "time",
	time_limit: 30,
	note_limit: 25,
	scale: "C Major",
	octave: 4,
};

function defaultConfig(gameType: GameType): Record<string, unknown> {
	if (gameType === "note") {
		return { ...NOTE_DEFAULTS } as unknown as Record<string, unknown>;
	}
	return {
		...GENERIC_GAMES[gameType].defaults,
	} as unknown as Record<string, unknown>;
}

/** Renders a generic game's settings using the same UI the game uses. */
function GenericGameSettings({
	gameType,
	config,
	onPatch,
}: {
	gameType: GenericGameType;
	config: Record<string, unknown>;
	onPatch: (patch: Record<string, unknown>) => void;
}) {
	const definition = GENERIC_GAMES[gameType];
	const settings = config as unknown as BaseGameSettings;
	const patch = (p: Partial<BaseGameSettings>) =>
		onPatch(p as Record<string, unknown>);
	return (
		<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
			<GameModeLimitControls settings={settings} onChange={patch} />
			<SettingsControls
				schema={
					definition.settingsSchema as SettingDescriptor<BaseGameSettings>[]
				}
				settings={settings}
				onChange={patch}
			/>
		</div>
	);
}

/** Minimal controls for the note game's snake_case config shape. */
function NoteGameSettings({
	config,
	onPatch,
}: {
	config: NoteGameSettingsRequest;
	onPatch: (patch: Record<string, unknown>) => void;
}) {
	const isTimeMode = config.game_mode === "time";
	return (
		<div className="space-y-3">
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<div className="space-y-1">
					<span className="block text-xs font-medium">Mode</span>
					<div className="flex gap-1.5">
						<Button
							size="sm"
							variant={isTimeMode ? "default" : "outline"}
							onClick={() => onPatch({ game_mode: "time" })}
						>
							Time
						</Button>
						<Button
							size="sm"
							variant={!isTimeMode ? "default" : "outline"}
							onClick={() => onPatch({ game_mode: "notes" })}
						>
							Notes
						</Button>
					</div>
				</div>

				<div className="space-y-1">
					<span className="block text-xs font-medium">
						{isTimeMode ? "Time Limit" : "Notes"}
					</span>
					{isTimeMode ? (
						<Select
							aria-label="Time Limit"
							value={String(config.time_limit)}
							onChange={(e) => onPatch({ time_limit: Number(e.target.value) })}
						>
							{TIME_LIMITS.map((limit) => (
								<option key={limit} value={limit}>
									{limit}s
								</option>
							))}
						</Select>
					) : (
						<Select
							aria-label="Note Limit"
							value={String(config.note_limit)}
							onChange={(e) => onPatch({ note_limit: Number(e.target.value) })}
						>
							{NOTE_LIMITS.map((limit) => (
								<option key={limit} value={limit}>
									{limit}
								</option>
							))}
						</Select>
					)}
				</div>

				<div className="space-y-1">
					<span className="block text-xs font-medium">Scale</span>
					<Select
						aria-label="Scale"
						value={config.scale}
						onChange={(e) => onPatch({ scale: e.target.value })}
					>
						{SCALES.map((scale) => (
							<option key={scale} value={scale}>
								{scale}
							</option>
						))}
					</Select>
				</div>

				<div className="space-y-1">
					<span className="block text-xs font-medium">Clef</span>
					<Select
						aria-label="Clef"
						value={config.clef}
						onChange={(e) => {
							const clef = e.target.value as NoteGameSettingsRequest["clef"];
							onPatch({
								clef,
								low_note: DEFAULT_RANGE[clef].low,
								high_note: DEFAULT_RANGE[clef].high,
							});
						}}
					>
						<option value="treble">{CLEF_LABELS.treble}</option>
						<option value="bass">{CLEF_LABELS.bass}</option>
					</Select>
				</div>
			</div>

			<div className="space-y-1">
				<span className="block text-xs font-medium">Note range</span>
				<StaffRangePicker
					clef={config.clef}
					low={config.low_note}
					high={config.high_note}
					onChange={(low, high) => onPatch({ low_note: low, high_note: high })}
				/>
			</div>
		</div>
	);
}

export interface CreateAssignmentDialogProps {
	classId: number;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CreateAssignmentDialog({
	classId,
	open,
	onOpenChange,
}: CreateAssignmentDialogProps) {
	const createAssignment = useCreateAssignment();

	const [title, setTitle] = useState("");
	const [titleError, setTitleError] = useState<string | undefined>();
	const [gameType, setGameType] = useState<GameType>("note");
	const [config, setConfig] = useState<Record<string, unknown>>(() =>
		defaultConfig("note"),
	);
	const [dueAt, setDueAt] = useState("");
	const [targetQuestions, setTargetQuestions] = useState("");
	const [targetAccuracy, setTargetAccuracy] = useState("");

	// Reset the whole form on close so reopening starts fresh. Done in the
	// open-change handler (an event) rather than an effect.
	function handleOpenChange(next: boolean) {
		if (!next) {
			setTitle("");
			setTitleError(undefined);
			setGameType("note");
			setConfig(defaultConfig("note"));
			setDueAt("");
			setTargetQuestions("");
			setTargetAccuracy("");
		}
		onOpenChange(next);
	}

	function changeGameType(next: GameType) {
		setGameType(next);
		// Switching games snapshots that game's own defaults as the config.
		setConfig(defaultConfig(next));
	}

	function patchConfig(patch: Record<string, unknown>) {
		setConfig((current) => ({ ...current, ...patch }));
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const trimmed = title.trim();
		if (!trimmed) {
			setTitleError("Title is required");
			return;
		}

		const request: CreateAssignmentRequest = {
			title: trimmed,
			game_type: gameType,
			config,
			due_at: dueAt ? new Date(dueAt).toISOString() : null,
			target_questions: targetQuestions.trim() ? Number(targetQuestions) : null,
			target_accuracy: targetAccuracy.trim() ? Number(targetAccuracy) : null,
		};

		createAssignment.mutate(
			{ classId, request },
			{ onSuccess: () => handleOpenChange(false) },
		);
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent
				onOpenChange={handleOpenChange}
				className="max-h-[90vh] overflow-y-auto"
			>
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle className="font-display">New assignment</DialogTitle>
					</DialogHeader>

					<div className="p-6 space-y-4">
						<FormField
							label="Title"
							required
							htmlFor="assignment-title"
							error={titleError}
						>
							<Input
								id="assignment-title"
								placeholder="Week 1: Treble Notes"
								value={title}
								error={titleError}
								onChange={(e) => {
									setTitle(e.target.value);
									if (titleError) setTitleError(undefined);
								}}
							/>
						</FormField>

						<FormField label="Game" htmlFor="assignment-game-type">
							<Select
								id="assignment-game-type"
								value={gameType}
								onChange={(e) => changeGameType(e.target.value as GameType)}
							>
								{GAME_TYPE_OPTIONS.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
							</Select>
						</FormField>

						<div className="rounded-lg border-2 border-border p-4">
							{gameType === "note" ? (
								<NoteGameSettings
									config={config as unknown as NoteGameSettingsRequest}
									onPatch={patchConfig}
								/>
							) : (
								<GenericGameSettings
									gameType={gameType}
									config={config}
									onPatch={patchConfig}
								/>
							)}
						</div>

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
							<FormField label="Due date" htmlFor="assignment-due">
								<Input
									id="assignment-due"
									type="datetime-local"
									value={dueAt}
									onChange={(e) => setDueAt(e.target.value)}
								/>
							</FormField>
							<FormField label="Target questions" htmlFor="assignment-target-q">
								<Input
									id="assignment-target-q"
									type="number"
									min={1}
									placeholder="Optional"
									value={targetQuestions}
									onChange={(e) => setTargetQuestions(e.target.value)}
								/>
							</FormField>
							<FormField
								label="Target accuracy %"
								htmlFor="assignment-target-a"
							>
								<Input
									id="assignment-target-a"
									type="number"
									min={1}
									max={100}
									placeholder="Optional"
									value={targetAccuracy}
									onChange={(e) => setTargetAccuracy(e.target.value)}
								/>
							</FormField>
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => handleOpenChange(false)}
							disabled={createAssignment.isPending}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							variant="brass"
							loading={createAssignment.isPending}
						>
							Create assignment
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

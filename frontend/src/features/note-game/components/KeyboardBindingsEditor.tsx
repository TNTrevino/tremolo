import { useCallback, useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { cn } from "@/lib/utils";

const SHARP_NOTES = ["C#", "D#", "E#", "F#", "G#", "A#", "B#"] as const;
const NATURAL_NOTES = ["C", "D", "E", "F", "G", "A", "B"] as const;
const FLAT_NOTES = ["Cb", "Db", "Eb", "Fb", "Gb", "Ab", "Bb"] as const;

const DEFAULT_BINDINGS: Record<string, string> = {
	"C#": "q",
	"D#": "w",
	"E#": "e",
	"F#": "r",
	"G#": "t",
	"A#": "y",
	"B#": "u",
	C: "a",
	D: "s",
	E: "d",
	F: "f",
	G: "g",
	A: "h",
	B: "j",
	Cb: "z",
	Db: "x",
	Eb: "c",
	Fb: "v",
	Gb: "b",
	Ab: "n",
	Bb: "m",
};

export interface KeyboardBindingsEditorProps {
	bindings: Record<string, string>;
	onChange: (bindings: Record<string, string>) => void;
	onListeningChange?: (note: string | null) => void;
}

interface NoteKeyButtonProps {
	note: string;
	assignedKey: string | undefined;
	isListening: boolean;
	onClick: () => void;
}

function NoteKeyButton({
	note,
	assignedKey,
	isListening,
	onClick,
}: NoteKeyButtonProps) {
	return (
		<Button
			variant="outline"
			onClick={onClick}
			className={cn(
				"h-16 flex-col gap-0.5 px-1",
				isListening &&
					"border-primary/40 bg-primary/5 shadow-[0_0_6px_0] shadow-primary/20",
			)}
		>
			<span className="text-sm font-bold">{note}</span>
			{isListening ? (
				<span className="text-xs text-primary/60">...</span>
			) : (
				<span className="text-xs text-muted-foreground">
					{assignedKey ?? "---"}
				</span>
			)}
		</Button>
	);
}

export function KeyboardBindingsEditor({
	bindings,
	onChange,
	onListeningChange,
}: KeyboardBindingsEditorProps) {
	const [listeningNote, setListeningNote] = useState<string | null>(null);

	const setListening = useCallback(
		(note: string | null) => {
			setListeningNote(note);
			onListeningChange?.(note);
		},
		[onListeningChange],
	);

	useEffect(() => {
		if (listeningNote === null) return;

		function handleKeyDown(e: KeyboardEvent) {
			e.preventDefault();

			if (e.key === "Escape") {
				setListening(null);
				return;
			}

			const pressedKey = e.key;
			const oldKey = bindings[listeningNote!];
			const conflictingNote = Object.entries(bindings).find(
				([note, key]) => key === pressedKey && note !== listeningNote,
			);

			const updated = { ...bindings };
			updated[listeningNote!] = pressedKey;

			if (conflictingNote && oldKey) {
				updated[conflictingNote[0]] = oldKey;
			}

			onChange(updated);
			setListening(null);
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [listeningNote, bindings, onChange, setListening]);

	function renderRow(label: string, notes: readonly string[]) {
		return (
			<div className="space-y-1">
				<span className="text-xs font-medium text-muted-foreground">
					{label}
				</span>
				<div className="grid grid-cols-7 gap-2">
					{notes.map((note) => (
						<NoteKeyButton
							key={note}
							note={note}
							assignedKey={bindings[note]}
							isListening={listeningNote === note}
							onClick={() => setListening(note)}
						/>
					))}
				</div>
			</div>
		);
	}

	return (
		<Card className="space-y-4 p-4">
			{renderRow("Sharps", SHARP_NOTES)}
			{renderRow("Naturals", NATURAL_NOTES)}
			{renderRow("Flats", FLAT_NOTES)}
			<div className="flex justify-end pt-2">
				<Button
					variant="ghost"
					size="sm"
					onClick={() => onChange(DEFAULT_BINDINGS)}
				>
					Reset to Defaults
				</Button>
			</div>
		</Card>
	);
}

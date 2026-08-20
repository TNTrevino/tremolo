import { musicService } from "@/services/api";
import type {
	KeySignatureGameRequest,
	KeySignatureGameResponse,
	StaffClef,
} from "@/services/api/types";
import { GameMode } from "../types";
import type { BaseGameSettings } from "../types";
import { NATURAL_NOTES } from "../utils";
import {
	KeySignatureGlyph,
	keySignatureName,
} from "../components/KeySignatureGlyph";
import { clefsSetting } from "../settings/presets";
import { defineGame } from "./types";

export interface KeySignatureGameSettings extends BaseGameSettings {
	clefs: StaffClef[];
	/** Fifths counts to quiz on, -7 (7 flats) .. 7 (7 sharps) */
	keySignatures: number[];
	noteNames: "letters" | "solfege";
	answerMode: "major" | "minor";
}

const ALL_KEY_SIGNATURES = Array.from({ length: 15 }, (_, i) => i - 7);

// Fixed-do solfege names for the naturals, in NATURAL_NOTES order.
const SOLFEGE: Record<string, string> = {
	C: "Do",
	D: "Re",
	E: "Mi",
	F: "Fa",
	G: "Sol",
	A: "La",
	B: "Ti",
};

const noteLabel = (
	letter: string,
	accidental: "" | "#" | "b",
	noteNames: KeySignatureGameSettings["noteNames"],
): string =>
	noteNames === "solfege"
		? `${SOLFEGE[letter]}${accidental}`
		: `${letter}${accidental}`;

/**
 * Key Signature Identification: shows a clef + key signature; the
 * player names the exact tonic (major or minor per settings) from the
 * sharps/naturals/flats grid.
 */
export const keySignatureGame = defineGame<
	KeySignatureGameResponse,
	KeySignatureGameSettings,
	KeySignatureGameRequest
>({
	gameType: "key_signature",
	title: "Key Signature Identification",
	description: "Identify the displayed key signature",
	defaults: {
		gameMode: GameMode.Time,
		timeLimit: 30,
		noteLimit: 25,
		clefs: ["treble"],
		keySignatures: ALL_KEY_SIGNATURES,
		noteNames: "letters",
		answerMode: "major",
	},
	settingsSchema: [
		clefsSetting(),
		{
			kind: "multiChoice",
			key: "keySignatures",
			label: "Key Signatures",
			options: ALL_KEY_SIGNATURES.map((fifths) => ({
				value: fifths,
				label: keySignatureName(fifths),
				render: (
					<KeySignatureGlyph fifths={fifths} className="px-0.5 text-lg" />
				),
			})),
		},
		{
			kind: "choice",
			key: "noteNames",
			label: "Note Names",
			options: [
				{ value: "letters", label: "Letters" },
				{ value: "solfege", label: "Solfege" },
			],
		},
		{
			kind: "choice",
			key: "answerMode",
			label: "Answer",
			options: [
				{ value: "major", label: "Major keys" },
				{ value: "minor", label: "Minor keys" },
			],
		},
	],
	toRequest: (settings) => ({
		clefs: settings.clefs,
		keySignatures: settings.keySignatures,
	}),
	fetchQuestion: (request) => musicService.generateKeySignatureGame(request),
	getAnswer: (question, settings) =>
		settings.answerMode === "minor" ? question.minorTonic : question.tonic,
	// Note-game-style grid: sharps on top, naturals in the middle,
	// flats on the bottom. F# Major vs Gb Major are distinct answers.
	answerOptions: (settings) => [
		...NATURAL_NOTES.map((letter) => ({
			value: `${letter}#`,
			label: noteLabel(letter, "#", settings.noteNames),
			variant: "outline" as const,
		})),
		...NATURAL_NOTES.map((letter) => ({
			value: letter as string,
			label: noteLabel(letter, "", settings.noteNames),
			variant: "secondary" as const,
		})),
		...NATURAL_NOTES.map((letter) => ({
			value: `${letter}b`,
			label: noteLabel(letter, "b", settings.noteNames),
			variant: "outline" as const,
		})),
	],
	columnsClassName: "grid-cols-7",
	zoom: 2.2,
	prompt: (settings) => (
		<div className="text-center text-lg font-medium text-muted-foreground">
			__ {settings.answerMode === "minor" ? "Minor" : "Major"}
		</div>
	),
});

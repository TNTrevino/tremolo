import type {
	KeySignatureGameRequest,
	KeySignatureGameResponse,
	StaffClef,
} from "@shared/models/music.models";
import { keySignatureName } from "../components/key-signature-glyph/key-signature-glyph.component";
import { defineGame } from "../models/game-definition.models";
import { GameMode, type BaseGameSettings } from "../models/game-state.models";
import { NATURAL_NOTES } from "../game.utils";
import { clefsSetting } from "../settings/presets";

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
 * Key Signature Identification: shows a clef + key signature; the player
 * names the exact tonic (major or minor per settings) from the
 * sharps/naturals/flats grid.
 *
 * Port of
 * frontend-react/src/features/identification-game/games/keySignature.tsx --
 * and the reason that file was a `.tsx`. Its 15 key-signature options each
 * embedded a `<KeySignatureGlyph>` element; under D9 / PLAN.md §5.7 they
 * carry `{ kind: "keySignature", fifths }` instead, so **this is a `.ts`**
 * and the definition is data again.
 *
 * The definition is a module-level constant, so `fetchQuestion` takes the
 * music service as an argument rather than injecting it -- see the note on
 * the field in `game-definition.models.ts`.
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
				glyph: { kind: "keySignature", fifths },
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
	fetchQuestion: (request, music) => music.generateKeySignatureGame(request),
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
	prompt: (settings) =>
		`__ ${settings.answerMode === "minor" ? "Minor" : "Major"}`,
});

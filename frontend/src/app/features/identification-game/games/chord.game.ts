import type {
	ChordGameRequest,
	ChordGameResponse,
	ChordQuality,
	StaffClef,
} from "@shared/models/music.models";

import { defineGame } from "../models/game-definition.models";
import { GameMode, type BaseGameSettings } from "../models/game-state.models";
import { clefsSetting } from "../settings/presets";

export interface ChordGameSettings extends BaseGameSettings {
	clefs: StaffClef[];
	qualities: ChordQuality[];
	inversions: boolean;
}

const QUALITY_LABELS: Record<ChordQuality, string> = {
	major: "Major Triad",
	minor: "Minor Triad",
	augmented: "Augmented Triad",
	diminished: "Diminished Triad",
	dominant7: "Dominant 7th",
	major7: "Major 7th",
	minor7: "Minor 7th",
	half_diminished7: "Half-diminished 7th",
	diminished7: "Diminished 7th",
	dominant9: "Dominant 9th",
	major9: "Major 9th",
	minor9: "Minor 9th",
};

const ALL_QUALITIES = Object.keys(QUALITY_LABELS) as ChordQuality[];

/**
 * Chord Identification: shows a stacked chord; the player names its
 * quality. Covers triads, sevenths, and ninths, optionally inverted.
 *
 * Port of frontend-react/src/features/identification-game/games/chord.ts.
 */
export const chordGame = defineGame<
	ChordGameResponse,
	ChordGameSettings,
	ChordGameRequest
>({
	gameType: "chord",
	title: "Chord Identification",
	description: "Identify the displayed chord",
	defaults: {
		gameMode: GameMode.Time,
		timeLimit: 60,
		noteLimit: 25,
		clefs: ["treble"],
		qualities: ALL_QUALITIES,
		inversions: false,
	},
	settingsSchema: [
		clefsSetting(),
		{
			kind: "multiChoice",
			key: "qualities",
			label: "Chords",
			options: ALL_QUALITIES.map((quality) => ({
				value: quality,
				label: QUALITY_LABELS[quality],
			})),
		},
		{
			kind: "toggle",
			key: "inversions",
			label: "Inversions",
		},
	],
	toRequest: (settings) => ({
		clefs: settings.clefs,
		qualities: settings.qualities,
		inversions: settings.inversions,
	}),
	fetchQuestion: (request, music) => music.generateChordGame(request),
	getAnswer: (question) => question.quality,
	answerOptions: (settings) =>
		settings.qualities.map((quality) => ({
			value: quality,
			label: QUALITY_LABELS[quality],
		})),
	columnsClassName: "grid-cols-2 sm:grid-cols-3",
	zoom: 2.0,
});

import { musicService } from "@/services/api";
import type {
	IntervalDisplayMode,
	IntervalGameRequest,
	IntervalGameResponse,
	StaffClef,
} from "@/services/api/types";
import { GameMode } from "../types";
import type { BaseGameSettings } from "../types";
import { clefsSetting } from "../settings/presets";
import { defineGame } from "./types";

export interface IntervalGameSettings extends BaseGameSettings {
	clefs: StaffClef[];
	displayMode: IntervalDisplayMode;
	requireQuality: boolean;
	intervals: string[];
}

// Simple-interval pool within one octave (music21 names).
const ALL_INTERVALS = [
	"m2",
	"M2",
	"m3",
	"M3",
	"P4",
	"A4",
	"d5",
	"P5",
	"m6",
	"M6",
	"m7",
	"M7",
	"P8",
];

const ORDINALS: Record<number, string> = {
	2: "2nd",
	3: "3rd",
	4: "4th",
	5: "5th",
	6: "6th",
	7: "7th",
	8: "Octave",
};

const intervalNumber = (name: string): number => Number(name.slice(-1));

/**
 * Interval Identification: shows two notes (stacked or sequential);
 * the player names the interval — quality + size, or size only when
 * Require Quality is off.
 */
export const intervalGame = defineGame<
	IntervalGameResponse,
	IntervalGameSettings,
	IntervalGameRequest
>({
	gameType: "interval",
	title: "Interval Identification",
	description: "Identify the displayed interval",
	defaults: {
		gameMode: GameMode.Time,
		timeLimit: 60,
		noteLimit: 25,
		clefs: ["treble"],
		displayMode: "harmonic",
		requireQuality: true,
		intervals: ALL_INTERVALS,
	},
	settingsSchema: [
		clefsSetting(),
		{
			kind: "choice",
			key: "displayMode",
			label: "Display Mode",
			options: [
				{ value: "harmonic", label: "Harmonic" },
				{ value: "melodic", label: "Melodic" },
			],
		},
		{
			kind: "multiChoice",
			key: "intervals",
			label: "Intervals",
			options: ALL_INTERVALS.map((name) => ({ value: name, label: name })),
		},
		{
			kind: "toggle",
			key: "requireQuality",
			label: "Require Quality",
		},
	],
	toRequest: (settings) => ({
		clefs: settings.clefs,
		displayMode: settings.displayMode,
		intervals: settings.intervals,
	}),
	fetchQuestion: (request) => musicService.generateIntervalGame(request),
	getAnswer: (question, settings) =>
		settings.requireQuality ? question.interval : String(question.number),
	answerOptions: (settings) => {
		if (settings.requireQuality) {
			return settings.intervals.map((name) => ({ value: name, label: name }));
		}
		const numbers = [...new Set(settings.intervals.map(intervalNumber))].sort(
			(a, b) => a - b,
		);
		return numbers.map((n) => ({
			value: String(n),
			label: ORDINALS[n] ?? String(n),
		}));
	},
	columnsClassName: "grid-cols-4 sm:grid-cols-7",
	zoom: 1.6,
});

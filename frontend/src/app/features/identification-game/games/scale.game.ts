import type {
	ScaleGameRequest,
	ScaleGameResponse,
	ScaleQuestionMode,
	ScaleType,
	StaffClef,
} from "@shared/models/music.models";

import { defineGame } from "../models/game-definition.models";
import { GameMode, type BaseGameSettings } from "../models/game-state.models";
import { clefsSetting } from "../settings/presets";

export interface ScaleGameSettings extends BaseGameSettings {
	clefs: StaffClef[];
	scaleTypes: ScaleType[];
	questionMode: ScaleQuestionMode;
}

const SCALE_TYPE_LABELS: Record<ScaleType, string> = {
	major: "Major",
	natural_minor: "Natural Minor",
	harmonic_minor: "Harmonic Minor",
	melodic_minor: "Melodic Minor",
};

const ALL_SCALE_TYPES = Object.keys(SCALE_TYPE_LABELS) as ScaleType[];

/**
 * Scale Identification: shows one octave of a scale; the player names the
 * scale type.
 *
 * Port of frontend-react/src/features/identification-game/games/scale.ts.
 */
export const scaleGame = defineGame<
	ScaleGameResponse,
	ScaleGameSettings,
	ScaleGameRequest
>({
	gameType: "scale",
	title: "Scale Identification",
	description: "Identify the displayed scale",
	defaults: {
		gameMode: GameMode.Time,
		timeLimit: 60,
		noteLimit: 25,
		clefs: ["treble"],
		scaleTypes: ALL_SCALE_TYPES,
		questionMode: "accidentals",
	},
	settingsSchema: [
		clefsSetting(),
		{
			kind: "multiChoice",
			key: "scaleTypes",
			label: "Scales",
			options: ALL_SCALE_TYPES.map((type) => ({
				value: type,
				label: SCALE_TYPE_LABELS[type],
			})),
		},
		{
			kind: "choice",
			key: "questionMode",
			label: "Question Mode",
			options: [
				{ value: "accidentals", label: "Use Accidentals" },
				{ value: "key_signature", label: "Use Key Signature" },
			],
		},
	],
	toRequest: (settings) => ({
		clefs: settings.clefs,
		scaleTypes: settings.scaleTypes,
		questionMode: settings.questionMode,
	}),
	fetchQuestion: (request, music) => music.generateScaleGame(request),
	getAnswer: (question) => question.scaleType,
	answerOptions: (settings) =>
		settings.scaleTypes.map((type) => ({
			value: type,
			label: SCALE_TYPE_LABELS[type],
		})),
	columnsClassName: "grid-cols-2",
	zoom: 1.2,
});

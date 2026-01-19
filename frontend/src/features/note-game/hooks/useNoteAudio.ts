import useSound from "use-sound";
import { useCallback, useMemo } from "react";
import { logError } from "@/shared/utils/error.utils";

/**
 * Maps musical note names to their corresponding audio file names
 * Handles both sharp (♯) and flat (♭) notations
 *
 * @param noteName - The note name (e.g., "C", "C#", "Db", "D♯")
 * @returns The corresponding audio file name without extension (e.g., "c4", "csharp4")
 */
const getNoteFileName = (noteName: string): string => {
	// Normalize the note name: remove spaces, convert to uppercase
	const normalized = noteName.trim().toUpperCase();

	// Map of note names to file names
	const noteMap: Record<string, string> = {
		C: "c4",
		"C#": "csharp4",
		"C♯": "csharp4",
		DB: "csharp4", // Db is enharmonic to C#
		D: "d4",
		"D#": "dsharp4",
		"D♯": "dsharp4",
		EB: "dsharp4", // Eb is enharmonic to D#
		E: "e4",
		F: "f4",
		"F#": "fsharp4",
		"F♯": "fsharp4",
		GB: "fsharp4", // Gb is enharmonic to F#
		G: "g4",
		"G#": "gsharp4",
		"G♯": "gsharp4",
		AB: "gsharp4", // Ab is enharmonic to G#
		A: "a4",
		"A#": "asharp4",
		"A♯": "asharp4",
		BB: "asharp4", // Bb is enharmonic to A#
		B: "b4",
	};

	return noteMap[normalized] || "";
};

/**
 * Custom hook for playing note audio feedback using marimba sounds
 *
 * This hook provides a simple API to play audio feedback when a user
 * correctly identifies a note. It uses the use-sound library to preload
 * all marimba audio files for smooth playback.
 *
 * @param options - Optional configuration
 * @param options.volume - Volume level (0 to 1), defaults to 0.5
 *
 * @returns Object containing playNoteSound function
 *
 * @example
 * ```tsx
 * const { playNoteSound } = useNoteAudio();
 *
 * // Play sound for C#
 * playNoteSound('C#');
 *
 * // Play sound for D with custom volume
 * const { playNoteSound } = useNoteAudio({ volume: 0.7 });
 * playNoteSound('D');
 * ```
 */
export function useNoteAudio(options?: { volume?: number }) {
	const volume = options?.volume ?? 0.5;

	// Preload all audio files for better performance
	const [playC] = useSound("/audio/marimba-c4.mp3", { volume });
	const [playCSharp] = useSound("/audio/marimba-csharp4.mp3", { volume });
	const [playD] = useSound("/audio/marimba-d4.mp3", { volume });
	const [playDSharp] = useSound("/audio/marimba-dsharp4.mp3", { volume });
	const [playE] = useSound("/audio/marimba-e4.mp3", { volume });
	const [playF] = useSound("/audio/marimba-f4.mp3", { volume });
	const [playFSharp] = useSound("/audio/marimba-fsharp4.mp3", { volume });
	const [playG] = useSound("/audio/marimba-g4.mp3", { volume });
	const [playGSharp] = useSound("/audio/marimba-gsharp4.mp3", { volume });
	const [playA] = useSound("/audio/marimba-a4.mp3", { volume });
	const [playASharp] = useSound("/audio/marimba-asharp4.mp3", { volume });
	const [playB] = useSound("/audio/marimba-b4.mp3", { volume });

	// Create a map of file names to their play functions
	const soundMap = useMemo(
		() => ({
			c4: playC,
			csharp4: playCSharp,
			d4: playD,
			dsharp4: playDSharp,
			e4: playE,
			f4: playF,
			fsharp4: playFSharp,
			g4: playG,
			gsharp4: playGSharp,
			a4: playA,
			asharp4: playASharp,
			b4: playB,
		}),
		[
			playC,
			playCSharp,
			playD,
			playDSharp,
			playE,
			playF,
			playFSharp,
			playG,
			playGSharp,
			playA,
			playASharp,
			playB,
		],
	);

	/**
	 * Plays the marimba sound for the specified note
	 *
	 * @param noteName - The note name (e.g., "C", "C#", "Db")
	 */
	const playNoteSound = useCallback(
		(noteName: string) => {
			const fileName = getNoteFileName(noteName);

			if (!fileName) {
				console.warn(`[useNoteAudio] Unknown note name: "${noteName}"`);
				return;
			}

			const playFunction = soundMap[fileName as keyof typeof soundMap];

			if (!playFunction) {
				console.warn(
					`[useNoteAudio] No audio file found for note: "${noteName}" (mapped to ${fileName})`,
				);
				return;
			}

			try {
				playFunction();
			} catch (error) {
				logError(error, "useNoteAudio.playSound");
			}
		},
		[soundMap],
	);

	return {
		playNoteSound,
	};
}

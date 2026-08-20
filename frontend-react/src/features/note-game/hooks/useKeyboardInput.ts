import { useEffect, useMemo, useRef } from "react";

/**
 * Default keyboard key to musical note mapping.
 * Maps 3 keyboard rows to 21 notes across sharps, naturals, and flats:
 *   - Top row (q-u): sharps (C# through B#)
 *   - Home row (a-j): naturals (C through B)
 *   - Bottom row (z-m): flats (Cb through Bb)
 *
 * Both lowercase and uppercase variants are included for case-insensitive input.
 */
export const DEFAULT_KEY_TO_NOTE_MAP: Record<string, string> = {
	// Sharps row (qwerty keyboard top row)
	q: "C#",
	Q: "C#",
	w: "D#",
	W: "D#",
	e: "E#",
	E: "E#",
	r: "F#",
	R: "F#",
	t: "G#",
	T: "G#",
	y: "A#",
	Y: "A#",
	u: "B#",
	U: "B#",
	// Naturals row (home row)
	a: "C",
	A: "C",
	s: "D",
	S: "D",
	d: "E",
	D: "E",
	f: "F",
	F: "F",
	g: "G",
	G: "G",
	h: "A",
	H: "A",
	j: "B",
	J: "B",
	// Flats row (bottom row)
	z: "Cb",
	Z: "Cb",
	x: "Db",
	X: "Db",
	c: "Eb",
	C: "Eb",
	v: "Fb",
	V: "Fb",
	b: "Gb",
	B: "Gb",
	n: "Ab",
	N: "Ab",
	m: "Bb",
	M: "Bb",
};

/**
 * Inverse of the default mapping: note name to lowercase key.
 * Useful for displaying key hints on buttons.
 */
export const DEFAULT_NOTE_TO_KEY_MAP: Record<string, string> = {
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

/**
 * Options for the useKeyboardInput hook
 */
interface UseKeyboardInputOptions {
	/**
	 * Callback function called when a valid musical note key is pressed
	 * @param noteName - The musical note name (e.g., "C", "C#", "Cb", etc.)
	 */
	onNoteInput: (noteName: string) => void;

	/**
	 * Whether the keyboard listener is active
	 * When false, keyboard events are not processed
	 * @default true
	 */
	enabled?: boolean;

	/**
	 * Custom note-to-key bindings (e.g., { C: "a", "C#": "q", Cb: "z" }).
	 * When provided, overrides the default keyboard mapping.
	 */
	keyBindings?: Record<string, string>;
}

/**
 * Custom hook for handling keyboard input mapped to musical notes.
 *
 * Maps 3 keyboard rows to 21 notes covering sharps, naturals, and flats:
 *   - Top row (q-u): C#, D#, E#, F#, G#, A#, B#
 *   - Home row (a-j): C, D, E, F, G, A, B
 *   - Bottom row (z-m): Cb, Db, Eb, Fb, Gb, Ab, Bb
 *
 * Custom key bindings can be supplied via the `keyBindings` option as a
 * note-to-key map. The hook inverts the map internally and registers both
 * lowercase and uppercase variants so input is case-insensitive.
 *
 * @example
 * ```tsx
 * useKeyboardInput({
 *   onNoteInput: (note) => handleAnswer(note),
 *   enabled: gameState === GameState.Playing || gameState === GameState.Ready,
 * });
 * ```
 *
 * @example Custom bindings
 * ```tsx
 * useKeyboardInput({
 *   onNoteInput: (note) => handleAnswer(note),
 *   keyBindings: { C: "a", "C#": "q", Cb: "z" },
 * });
 * ```
 *
 * @param options - Configuration options for the hook
 */
export function useKeyboardInput({
	onNoteInput,
	enabled = true,
	keyBindings,
}: UseKeyboardInputOptions): void {
	// Use ref to always have current callback without re-creating event listener
	const onNoteInputRef = useRef(onNoteInput);

	// Keep ref up to date
	useEffect(() => {
		onNoteInputRef.current = onNoteInput;
	}, [onNoteInput]);

	const activeKeyToNoteMap = useMemo(() => {
		if (!keyBindings) {
			return DEFAULT_KEY_TO_NOTE_MAP;
		}
		// Invert note-to-key into key-to-note, with both cases
		const map: Record<string, string> = {};
		for (const [note, key] of Object.entries(keyBindings)) {
			map[key] = note;
			map[key.toLowerCase()] = note;
			map[key.toUpperCase()] = note;
		}
		return map;
	}, [keyBindings]);

	useEffect(() => {
		// Don't add listener if disabled
		if (!enabled) {
			return;
		}

		/**
		 * Handle keyboard events and map to musical notes
		 */
		const handleKeyDown = (event: KeyboardEvent): void => {
			// Get the note mapping for this key
			const noteName = activeKeyToNoteMap[event.key];

			// If this is a valid game key, process it
			if (noteName) {
				// Prevent default browser behavior (e.g., scrolling, form submission)
				event.preventDefault();

				// Call the note input callback
				onNoteInputRef.current(noteName);
			}
		};

		// Add event listener to the document
		document.addEventListener("keydown", handleKeyDown);

		// Cleanup: remove event listener on unmount or when dependencies change
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [enabled, activeKeyToNoteMap]);
}

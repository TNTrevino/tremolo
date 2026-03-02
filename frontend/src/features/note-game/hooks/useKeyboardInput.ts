import { useEffect, useRef } from "react";

/**
 * Keyboard key to musical note mapping
 * Maps keyboard keys to chromatic scale notes (C through B)
 */
const KEY_TO_NOTE_MAP: Record<string, string> = {
	a: "C",
	A: "C",
	s: "C#",
	S: "C#",
	d: "D",
	D: "D",
	f: "D#",
	F: "D#",
	g: "E",
	G: "E",
	h: "F",
	H: "F",
	j: "F#",
	J: "F#",
	k: "G",
	K: "G",
	l: "G#",
	L: "G#",
	";": "A",
	":": "A", // Shift + ; on some keyboards
	"'": "A#",
	'"': "A#", // Shift + ' on some keyboards
	Enter: "B",
};

/**
 * Options for the useKeyboardInput hook
 */
interface UseKeyboardInputOptions {
	/**
	 * Callback function called when a valid musical note key is pressed
	 * @param noteName - The musical note name (e.g., "C", "C#", "D", etc.)
	 */
	onNoteInput: (noteName: string) => void;

	/**
	 * Whether the keyboard listener is active
	 * When false, keyboard events are not processed
	 * @default true
	 */
	enabled?: boolean;
}

/**
 * Custom hook for handling keyboard input mapped to musical notes
 *
 * Maps keyboard keys A-K (and semicolon, quote, Enter) to musical notes C through B.
 * Handles both lowercase and uppercase keys, prevents default browser behavior
 * for game keys, and provides an enable/disable mechanism.
 *
 * @example
 * ```tsx
 * useKeyboardInput({
 *   onNoteInput: (note) => handleAnswer(note),
 *   enabled: gameState === GameState.Playing
 * });
 * ```
 *
 * Key Mapping:
 * - A -> C
 * - S -> C#
 * - D -> D
 * - F -> D#
 * - G -> E
 * - H -> F
 * - J -> F#
 * - K -> G
 * - L -> G#
 * - ; -> A
 * - ' -> A#
 * - Enter -> B
 *
 * @param options - Configuration options for the hook
 */
export function useKeyboardInput({
	onNoteInput,
	enabled = true,
}: UseKeyboardInputOptions): void {
	// Use ref to always have current callback without re-creating event listener
	const onNoteInputRef = useRef(onNoteInput);

	// Keep ref up to date
	useEffect(() => {
		onNoteInputRef.current = onNoteInput;
	}, [onNoteInput]);

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
			const noteName = KEY_TO_NOTE_MAP[event.key];

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
	}, [enabled]);
}

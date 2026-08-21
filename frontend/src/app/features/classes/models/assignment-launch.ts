/**
 * What an assignment hands to a game when a student presses Practice.
 *
 * This is the exact shape React's `AssignmentPlayPage` memoized and passed
 * as the `assignment` prop into `NoteGamePage` / `IdentificationGamePage`:
 * the assignment's id, so the score entry can be tagged with it, and the
 * assignment's **frozen** config, which replaces the student's personal
 * settings for the duration of the game.
 *
 * It lives in the classes feature rather than in a game feature on purpose
 * -- it is the classes side of the contract, and the game phases consume
 * it. React needed a `useMemo` to keep the object identity stable across
 * re-renders; a `computed()` gives that for free.
 */
export interface AssignmentLaunch {
	id: number;
	config: Record<string, unknown>;
}

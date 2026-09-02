import type { Signal } from "@angular/core";
import { takeUntilDestroyed, toObservable } from "@angular/core/rxjs-interop";
import { EMPTY, filter, fromEvent, map, switchMap } from "rxjs";

/**
 * Physical keyboard input for the note game. Port of
 * frontend-react/src/features/note-game/hooks/useKeyboardInput.ts.
 *
 * PLAN.md §5.6's shape, exactly: `fromEvent` on `document`, `map`/`filter`
 * through the keymap, `takeUntilDestroyed()` at creation. There is no stored
 * `Subscription`, no `ngOnDestroy`, and nothing to unsubscribe by hand.
 *
 * **The listener is attached only while input is enabled.** `switchMap` over
 * `enabled` subscribes to `keydown` when the game starts accepting answers
 * and unsubscribes when it stops -- the direct equivalent of React's
 * `useEffect` that returned early when `enabled` was false, rather than an
 * always-on stream that drops events. That matters for more than tidiness:
 * `preventDefault()` is only called for keys this actually consumes, so the
 * page's own keyboard behaviour is untouched when a dialog is open or the
 * results screen is up.
 *
 * React's `onNoteInputRef` has no port. It existed so a changing callback
 * identity would not re-create the listener; a plain closure over signals
 * has one identity for the life of the component.
 *
 * **`onNote` also receives the event's `timeStamp`.** The note game ignores
 * it -- an answer is right or wrong, never early or late -- but the note
 * stream game judges a press against a beat, and the only honest press time
 * is the one the browser stamped on the event, not the one a callback reads
 * off the clock after rAF and change detection have had their turn. It is a
 * `DOMHighResTimeStamp` on the same origin as `performance.now()`, which is
 * the timeline `StreamTransportService` judges on.
 *
 * Call it from an injection context (a component or service constructor).
 */
export function noteKeyboardInput(options: {
	/** Whether keys are consumed right now (playing, no dialog open). */
	enabled: Signal<boolean>;
	/** Key -> note name. Built by `buildKeyToNoteMap`. */
	keyMap: Signal<Record<string, string>>;
	/**
	 * Called with the note name for a bound key, and the keydown event's
	 * `timeStamp` (ms on the `performance.now()` timeline).
	 */
	onNote: (note: string, timeStampMs: number) => void;
}): void {
	toObservable(options.enabled)
		.pipe(
			switchMap((enabled) =>
				enabled ? fromEvent<KeyboardEvent>(document, "keydown") : EMPTY,
			),
			map((event) => ({ event, note: options.keyMap()[event.key] })),
			filter(
				(hit): hit is { event: KeyboardEvent; note: string } =>
					hit.note !== undefined,
			),
			takeUntilDestroyed(),
		)
		.subscribe(({ event, note }) => {
			// Stops the browser doing its own thing with the key -- scrolling
			// on space, submitting a form, quick-find on "/".
			event.preventDefault();
			options.onNote(note, event.timeStamp);
		});
}

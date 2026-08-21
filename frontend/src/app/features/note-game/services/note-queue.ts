import type { Injector, Signal } from "@angular/core";

import type {
	NoteGameRequest,
	NoteGameResponse,
} from "../../../shared/models/music.models";
import type { MusicService } from "../../../shared/services/music.service";
import { QuestionQueue } from "./question-queue";

/**
 * Prefetch queue for note-game questions. Port of
 * frontend-react/src/features/note-game/hooks/useNoteQueue.ts.
 *
 * A thin binding of the generic queue to `/music/note-game`. React expressed
 * "reset when the settings change" as the fetcher's `useCallback` identity;
 * here the request payload *is* the key, which is both what PLAN.md §5.5
 * describes and a more honest statement of the invariant -- **only a setting
 * that changes this object resets the queue.**
 *
 * `octave` rides along because saved settings still carry it and the endpoint
 * still accepts it; the range is what decides the pitch.
 */
export function createNoteQueue(options: {
	/** `null` until the OSMD container is mounted (React's `isReady`). */
	request: Signal<NoteGameRequest | null>;
	music: MusicService;
	onError: (message: string) => void;
	onFetchFailure?: (error: unknown) => void;
	injector: Injector;
}): QuestionQueue<NoteGameRequest, NoteGameResponse> {
	return new QuestionQueue<NoteGameRequest, NoteGameResponse>({
		request: options.request,
		fetchQuestion: (request) => options.music.generateNoteGame(request),
		onError: options.onError,
		onFetchFailure: options.onFetchFailure,
		injector: options.injector,
	});
}

/** `"C Major"` -> `"C"`. Notation conversion happens in `MusicService`. */
export function extractTonic(scale: string): string {
	return scale.split(" ")[0] ?? "C";
}

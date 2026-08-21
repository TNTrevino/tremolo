import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";

import { LoggerService } from "../../../core/services/logger.service";

/**
 * Marimba feedback on a correct answer. Port of
 * frontend-react/src/features/note-game/hooks/useNoteAudio.ts.
 *
 * **The audio decision (PLAN.md §2, deferred to Phase 6): the Web Audio API,
 * no library.** `use-sound` is a React hook and cannot come along; it wraps
 * `howler`, so `howler` was the obvious candidate and it checks out on R6 --
 * `howler@2.2.4`, MIT, **no `peerDependencies` and no runtime dependencies**,
 * 318 KB unpacked, plus a DefinitelyTyped `@types/howler@2.2.13`. It was
 * still declined, because what React actually asks of it is one line: play
 * one of twelve preloaded mp3s at volume 0.5. Howler's reasons to exist --
 * audio sprites, spatial audio, per-format fallback sources, the HTML5
 * streaming fallback, its own autoplay-unlock shim -- are all unused here,
 * and a second package (types shipped separately, so two) is a standing R6
 * liability for a feature the platform implements. `.migration/
 * phase-6-handoff.md` §4 records the full comparison.
 *
 * What that decision costs and buys:
 *
 * - **Preloading is split in two.** The twelve files are *fetched* eagerly
 *   (that is all howler's `preload` does that matters here) but *decoded*
 *   lazily, because constructing an `AudioContext` before a user gesture
 *   makes the browser log an autoplay warning. The first correct answer is a
 *   click or a keypress, so the context is created inside a gesture.
 * - **Overlapping notes still work.** Each play gets a fresh
 *   `AudioBufferSourceNode`, so answering quickly layers notes rather than
 *   cutting the previous one off -- which is what howler does by default.
 * - **jsdom has no `AudioContext`.** Playback degrades to a no-op there
 *   instead of throwing, so the game is testable without a fake.
 */

/** Volume React passed to every `useSound` call. */
const DEFAULT_VOLUME = 0.5;

const AUDIO_PATH = "/audio";

/**
 * Maps musical note names to their audio file names, handling both sharp
 * (♯) and flat (♭) spellings. Verbatim from React, enharmonics included:
 * there are twelve samples, so Db plays C#'s.
 */
const NOTE_FILE_NAMES: Record<string, string> = {
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

/** Every distinct sample, for the eager fetch. */
const SAMPLE_FILES = [...new Set(Object.values(NOTE_FILE_NAMES))];

/**
 * The audio file for a note name, or `""` when there is none.
 *
 * Names are normalised the way React normalised them -- trimmed and
 * upper-cased -- which is why the flat keys in the table above are `DB`,
 * `EB`, `GB`, `AB`, `BB` rather than `Db`, `Eb`, ...
 */
export function getNoteFileName(noteName: string): string {
	return NOTE_FILE_NAMES[noteName.trim().toUpperCase()] ?? "";
}

@Injectable({ providedIn: "root" })
export class NoteAudioService {
	private readonly http = inject(HttpClient);
	private readonly logger = inject(LoggerService);

	private context: AudioContext | null = null;
	private readonly encoded = new Map<string, Promise<ArrayBuffer>>();
	private readonly decoded = new Map<string, AudioBuffer>();

	/**
	 * Starts fetching every sample. Called by the game board when it mounts,
	 * which is where React's twelve `useSound` calls ran.
	 */
	preload(): void {
		for (const file of SAMPLE_FILES) this.fetchSample(file);
	}

	/**
	 * Plays the marimba sound for a note. Unknown names are logged and
	 * ignored, exactly as React did -- a missing sample must never break the
	 * game loop.
	 */
	playNoteSound(noteName: string, volume: number = DEFAULT_VOLUME): void {
		const fileName = getNoteFileName(noteName);

		if (!fileName) {
			this.logger.warn(`[NoteAudioService] Unknown note name: "${noteName}"`);
			return;
		}

		void this.play(fileName, volume).catch((error: unknown) => {
			this.logger.error("Failed to play note sound", error);
		});
	}

	private async play(fileName: string, volume: number): Promise<void> {
		const context = this.ensureContext();
		if (!context) return;

		// A tab restored from the background can leave the context suspended.
		if (context.state === "suspended") await context.resume();

		const buffer = await this.ensureDecoded(context, fileName);
		if (!buffer) return;

		const source = context.createBufferSource();
		source.buffer = buffer;

		const gain = context.createGain();
		gain.gain.value = volume;

		source.connect(gain).connect(context.destination);
		source.start();
	}

	/** Created on first playback -- i.e. inside the answer's user gesture. */
	private ensureContext(): AudioContext | null {
		if (this.context) return this.context;
		if (typeof AudioContext === "undefined") return null;
		this.context = new AudioContext();
		return this.context;
	}

	private async ensureDecoded(
		context: AudioContext,
		fileName: string,
	): Promise<AudioBuffer | null> {
		const cached = this.decoded.get(fileName);
		if (cached) return cached;

		const encoded = await this.fetchSample(fileName);
		// `decodeAudioData` detaches the buffer it is given, so decode a copy
		// and keep the original for a later decode (a new context after a
		// navigation, say).
		const buffer = await context.decodeAudioData(encoded.slice(0));
		this.decoded.set(fileName, buffer);
		return buffer;
	}

	private fetchSample(fileName: string): Promise<ArrayBuffer> {
		const cached = this.encoded.get(fileName);
		if (cached) return cached;

		const request = firstValueFrom(
			this.http.get(`${AUDIO_PATH}/marimba-${fileName}.mp3`, {
				responseType: "arraybuffer",
			}),
		).catch((error: unknown) => {
			// Drop the rejected promise so a later answer retries rather than
			// replaying the same failure forever.
			this.encoded.delete(fileName);
			throw error;
		});

		this.encoded.set(fileName, request);
		return request;
	}
}

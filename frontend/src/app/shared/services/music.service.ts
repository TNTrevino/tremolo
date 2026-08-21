import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { catchError, map, type Observable, throwError, timeout } from "rxjs";

import { environment } from "../../../environments/environment";
import { LoggerService } from "../../core/services/logger.service";
import type {
	ChordGameRequest,
	ChordGameResponse,
	IntervalGameRequest,
	IntervalGameResponse,
	KeySignatureGameRequest,
	KeySignatureGameResponse,
	MaryRequest,
	NoteGameRequest,
	NoteGameResponse,
	RandomNotesRequest,
	ScaleGameRequest,
	ScaleGameResponse,
} from "../models/music.models";
import { fromMusic21NoteName, toMusic21NoteName } from "../utils/music.mapper";

/** React's `musicApiClient` timeout, carried over. */
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Client for the Python "music generation" microservice.
 *
 * Port of frontend-react/src/services/api/music.service.ts **and** of the
 * `musicApiClient` axios instance it sat on
 * (`services/api/clients/music-client.ts`) -- in Angular the base URL, the
 * timeout and the error shaping have no separate client object to live in,
 * so they live here. There is no auth: the music service is open, and the
 * bearer-token interceptor deliberately never fires for these URLs
 * (`core/interceptors/api-url.ts`).
 *
 * Observables in, Observables out (D5). The React version returned Promises
 * because TanStack Query mutations consumed it; the pages consume this
 * directly.
 *
 * **The notation boundary lives here and only here.** music21 spells flats
 * "-" ("B-"); the UI spells them "b" ("Bb"). Callers pass and receive UI
 * notation, and `toMusic21NoteName` / `fromMusic21NoteName` are called
 * nowhere else in the app.
 *
 * Phase 4 ported the two endpoints the sheet-music and converter pages use;
 * Phase 5 added the four identification-game endpoints and Phase 6
 * `/note-game`, so all six game endpoints now live here in the same shape.
 *
 * **The game endpoints answer JSON, so they do *not* take
 * `responseType: "text"`** -- that is only for `/mary` and `/random`, which
 * answer `application/xml` (phase-4-handoff.md §5). They do carry note
 * names, which is where `fromMusic21NoteName` gets its callers.
 */
@Injectable({ providedIn: "root" })
export class MusicService {
	private readonly http = inject(HttpClient);
	private readonly logger = inject(LoggerService);
	private readonly base = `${environment.musicApi}/music`;

	/** "Mary Had a Little Lamb", transposed to a tonic and octave. */
	generateMary(params: MaryRequest): Observable<string> {
		return this.postXml("/mary", {
			...params,
			tonic: toMusic21NoteName(params.tonic),
		});
	}

	/** A measure of random diatonic notes in the given rhythm. */
	generateRandom(params: RandomNotesRequest): Observable<string> {
		return this.postXml("/random", {
			...params,
			tonic: toMusic21NoteName(params.tonic),
		});
	}

	// --- Identification games ---------------------------------------------

	/** A clef plus a key signature; the answer is the tonic. */
	generateKeySignatureGame(
		params: KeySignatureGameRequest,
	): Observable<KeySignatureGameResponse> {
		return this.postJson<KeySignatureGameResponse>(
			"/key-signature-game",
			params,
		).pipe(
			map((response) => ({
				...response,
				tonic: fromMusic21NoteName(response.tonic),
				minorTonic: fromMusic21NoteName(response.minorTonic),
			})),
		);
	}

	/** One octave of a scale; the answer is the scale type. */
	generateScaleGame(params: ScaleGameRequest): Observable<ScaleGameResponse> {
		return this.postJson<ScaleGameResponse>("/scale-game", {
			...params,
			...(params.tonicPool
				? { tonicPool: params.tonicPool.map(toMusic21NoteName) }
				: {}),
		}).pipe(
			map((response) => ({
				...response,
				tonic: fromMusic21NoteName(response.tonic),
			})),
		);
	}

	/** A stacked chord; the answer is its quality. */
	generateChordGame(params: ChordGameRequest): Observable<ChordGameResponse> {
		return this.postJson<ChordGameResponse>("/chord-game", {
			...params,
			...(params.rootPool
				? { rootPool: params.rootPool.map(toMusic21NoteName) }
				: {}),
		}).pipe(
			map((response) => ({
				...response,
				root: fromMusic21NoteName(response.root),
			})),
		);
	}

	/**
	 * Two notes, stacked or in sequence; the answer is the interval.
	 *
	 * The only game endpoint with nothing to convert: music21 interval names
	 * ("m3", "P5") are not note names and carry no flat sign.
	 */
	generateIntervalGame(
		params: IntervalGameRequest,
	): Observable<IntervalGameResponse> {
		return this.postJson<IntervalGameResponse>("/interval-game", params);
	}

	// --- Note game ---------------------------------------------------------

	/**
	 * One random note inside the requested scale and pitch range, as MusicXML
	 * plus the answer the game validates against.
	 *
	 * Both ends of the notation boundary are crossed here: `scale` goes out
	 * as music21 spelling (`"Bb"` -> `"B-"`) and `noteName` comes back in UI
	 * spelling, so the answer pad's `"Bb"` button can be compared against it
	 * with `===`. `octave` is sent because the endpoint still accepts it and
	 * saved settings still carry it; the range is what actually decides the
	 * pitch.
	 */
	generateNoteGame(params: NoteGameRequest): Observable<NoteGameResponse> {
		return this.postJson<NoteGameResponse>("/note-game", {
			...params,
			scale: toMusic21NoteName(params.scale),
		}).pipe(
			map((response) => ({
				...response,
				noteName: fromMusic21NoteName(response.noteName),
			})),
		);
	}

	/**
	 * The game endpoints answer JSON, so this is a plain typed post -- the
	 * `responseType: "text"` below is specific to the two MusicXML routes.
	 * Timeout and error shaping are shared.
	 */
	private postJson<T>(path: string, body: unknown): Observable<T> {
		return this.http.post<T>(`${this.base}${path}`, body).pipe(
			timeout(REQUEST_TIMEOUT_MS),
			catchError((err: unknown) => throwError(() => this.describe(path, err))),
		);
	}

	/**
	 * The two MusicXML endpoints answer `application/xml`, not JSON, so the
	 * request asks for text: without `responseType: "text"` Angular runs the
	 * MusicXML through `JSON.parse` and every call fails on the first "<".
	 *
	 * The failure path reproduces the axios interceptor React had: the
	 * service's own plain-text body ("something is not right!...") becomes
	 * the error message, and anything without a body -- a timeout, a
	 * connection refused -- falls back to "Music generation failed", which
	 * is what the pages then show.
	 */
	private postXml(path: string, body: unknown): Observable<string> {
		return this.http
			.post(`${this.base}${path}`, body, { responseType: "text" })
			.pipe(
				timeout(REQUEST_TIMEOUT_MS),
				catchError((err: unknown) =>
					throwError(() => this.describe(path, err)),
				),
			);
	}

	private describe(path: string, err: unknown): Error {
		const status = err instanceof HttpErrorResponse ? err.status : undefined;
		const body =
			err instanceof HttpErrorResponse && typeof err.error === "string"
				? err.error
				: "";
		const message = body.trim() ? body : "Music generation failed";

		this.logger.error("Music API request failed", {
			url: `${this.base}${path}`,
			method: "post",
			status,
			message,
		});

		return new Error(message);
	}
}

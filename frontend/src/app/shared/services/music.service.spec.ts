import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../environments/environment";
import { MusicService } from "./music.service";

const MUSIC = `${environment.musicApi}/music`;

const XML = '<?xml version="1.0"?><score-partwise></score-partwise>';

describe("MusicService", () => {
	let music: MusicService;
	let backend: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()],
		});
		music = TestBed.inject(MusicService);
		backend = TestBed.inject(HttpTestingController);
	});

	afterEach(() => backend.verify());

	it("asks for MusicXML as text, not JSON", () => {
		let received: string | undefined;
		music.generateMary({ tonic: "C", octave: 4 }).subscribe((xml) => {
			received = xml;
		});

		const req = backend.expectOne(`${MUSIC}/mary`);
		// Without this the MusicXML is run through JSON.parse and every
		// call fails on the first "<".
		expect(req.request.responseType).toBe("text");
		req.flush(XML);

		expect(received).toBe(XML);
	});

	it("sends /mary its tonic in music21 notation", () => {
		music.generateMary({ tonic: "Bb", octave: 4 }).subscribe();

		const req = backend.expectOne(`${MUSIC}/mary`);
		expect(req.request.body).toEqual({ tonic: "B-", octave: 4 });
		req.flush(XML);
	});

	it("sends /random its tonic in music21 notation", () => {
		music
			.generateRandom({ rhythm: "1111", rhythmType: 16, tonic: "Eb" })
			.subscribe();

		const req = backend.expectOne(`${MUSIC}/random`);
		expect(req.request.body).toEqual({
			rhythm: "1111",
			rhythmType: 16,
			tonic: "E-",
		});
		req.flush(XML);
	});

	it("leaves a natural tonic untouched", () => {
		music.generateMary({ tonic: "B", octave: 3 }).subscribe();

		const req = backend.expectOne(`${MUSIC}/mary`);
		expect(req.request.body).toEqual({ tonic: "B", octave: 3 });
		req.flush(XML);
	});

	it("surfaces the service's own plain-text error body", () => {
		let message: string | undefined;
		music
			.generateRandom({ rhythm: "9", rhythmType: 16, tonic: "C" })
			.subscribe({
				error: (err: Error) => {
					message = err.message;
				},
			});

		backend
			.expectOne(`${MUSIC}/random`)
			.flush("something is not right!bad rhythm", {
				status: 400,
				statusText: "Bad Request",
			});

		// React's axios interceptor put String(response.data) on the error
		// it rejected with, and the page printed it. Same string here.
		expect(message).toBe("something is not right!bad rhythm");
	});

	it("falls back to React's wording when there is no body", () => {
		let message: string | undefined;
		music.generateMary({ tonic: "C", octave: 4 }).subscribe({
			error: (err: Error) => {
				message = err.message;
			},
		});

		backend
			.expectOne(`${MUSIC}/mary`)
			.error(new ProgressEvent("error"), { status: 0, statusText: "" });

		expect(message).toBe("Music generation failed");
	});

	describe("/note-game", () => {
		const REQUEST = {
			scale: "Bb",
			octave: "4",
			lowNote: "C4",
			highNote: "C6",
			clef: "treble",
		} as const;

		it("crosses the notation boundary in both directions", () => {
			let received: { noteName: string } | undefined;
			music.generateNoteGame({ ...REQUEST }).subscribe((response) => {
				received = response;
			});

			const req = backend.expectOne(`${MUSIC}/note-game`);
			// Out: the UI's "Bb" becomes music21's "B-".
			expect(req.request.body).toEqual({ ...REQUEST, scale: "B-" });
			// This one answers JSON, so it must NOT ask for text.
			expect(req.request.responseType).toBe("json");

			req.flush({ generatedXml: XML, noteName: "E-", noteOctave: "4" });

			// Back: music21's "E-" becomes the "Eb" the answer pad renders,
			// so the game can compare guesses with ===.
			expect(received?.noteName).toBe("Eb");
		});

		it("leaves naturals and sharps alone", () => {
			let received: { noteName: string } | undefined;
			music
				.generateNoteGame({ scale: "C", octave: "4" })
				.subscribe((response) => {
					received = response;
				});

			const req = backend.expectOne(`${MUSIC}/note-game`);
			expect(req.request.body).toEqual({ scale: "C", octave: "4" });
			req.flush({ generatedXml: XML, noteName: "F#", noteOctave: "5" });

			expect(received?.noteName).toBe("F#");
		});

		it("shapes failures the way the pages expect", () => {
			let message: string | undefined;
			music.generateNoteGame({ scale: "C", octave: "4" }).subscribe({
				error: (err: Error) => {
					message = err.message;
				},
			});

			backend.expectOne(`${MUSIC}/note-game`).flush("no note fits that range", {
				status: 400,
				statusText: "Bad Request",
			});

			expect(message).toBe("no note fits that range");
		});
	});

	it("talks to the music service, never the main one", () => {
		music.generateMary({ tonic: "C", octave: 4 }).subscribe();

		const req = backend.expectOne(`${MUSIC}/mary`);
		expect(req.request.url.startsWith(environment.musicApi)).toBe(true);
		expect(req.request.url.startsWith(environment.coreApi)).toBe(false);
		req.flush(XML);
	});
});

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { provideIcons } from "@ng-icons/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { environment } from "../../../../../environments/environment";
import { AuthStore } from "../../../../auth/services/auth.store";
import { TREMOLO_ICONS } from "../../../../core/icons";
import {
	DEFAULT_NOTE_TO_KEY_MAP,
	noteMapToKeyBindings,
} from "../../models/keymap";
import {
	mapSavedNoteGameSettings,
	NoteGamePageComponent,
} from "./note-game-page.component";

const SETTINGS_URL = `${environment.coreApi}/api/note-game/settings`;
const BINDINGS_URL = `${environment.coreApi}/api/note-game/keyboard-bindings`;
const NOTE_GAME_URL = `${environment.musicApi}/music/note-game`;

/**
 * A row as it was written before the staff range picker existed: an octave
 * and nothing else about pitch. The Go table has always had `low_note`,
 * `high_note` and `clef`, but a row can still carry values the current UI
 * would not produce -- an octave that disagrees with the range being the
 * whole point.
 */
const LEGACY_ROW = {
	id: 1,
	user_id: 7,
	game_mode: "notes",
	time_limit: 60,
	note_limit: 50,
	scale: "G Major",
	// Deliberately inconsistent with the range below: the range wins.
	octave: 2,
	low_note: "C4",
	high_note: "C6",
	clef: "treble" as const,
};

describe("mapSavedNoteGameSettings", () => {
	it("carries the legacy octave through untouched", () => {
		expect(mapSavedNoteGameSettings({ octave: 2 })).toEqual({ octave: 2 });
	});

	it("leaves a missing field alone rather than setting it undefined", () => {
		// A row that predates a field, or a hand-edited assignment config.
		const patch = mapSavedNoteGameSettings({ scale: "F Major" });

		expect(patch).toEqual({ scale: "F Major" });
		expect("clef" in patch).toBe(false);
		expect("octave" in patch).toBe(false);
	});

	it("maps every field the game owns", () => {
		expect(
			mapSavedNoteGameSettings({
				gameMode: "notes",
				timeLimit: 60,
				noteLimit: 50,
				scale: "G Major",
				octave: 2,
				lowNote: "E2",
				highNote: "E4",
				clef: "bass",
			}),
		).toEqual({
			gameMode: "notes",
			timeLimit: 60,
			noteLimit: 50,
			scale: "G Major",
			octave: 2,
			lowNote: "E2",
			highNote: "E4",
			clef: "bass",
		});
	});
});

describe("NoteGamePageComponent", () => {
	let fixture: ComponentFixture<NoteGamePageComponent>;
	let backend: HttpTestingController;

	beforeEach(() => {
		localStorage.clear();
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				provideHttpClient(),
				provideHttpClientTesting(),
				provideIcons(TREMOLO_ICONS),
			],
		});
		backend = TestBed.inject(HttpTestingController);

		const auth = TestBed.inject(AuthStore);
		auth.setToken("token");
		auth.setUser({
			id: 7,
			email: "student@example.com",
			firstName: "Test",
			lastName: "Student",
			role: "STUDENT",
		});
	});

	afterEach(() => {
		TestBed.resetTestingModule();
		localStorage.clear();
	});

	async function render(): Promise<void> {
		fixture = TestBed.createComponent(NoteGamePageComponent);
		fixture.detectChanges();
		await Promise.resolve();
	}

	/** Answers both settings resources; the audio preload is not asserted. */
	async function hydrate(settings: object | null): Promise<void> {
		backend
			.expectOne(SETTINGS_URL)
			.flush(settings, { status: 200, statusText: "OK" });
		backend
			.expectOne(BINDINGS_URL)
			.flush(null, { status: 404, statusText: "Not Found" });
		await fixture.whenStable();
		fixture.detectChanges();
		await fixture.whenStable();
	}

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	/** The prefetch requests the staff fires once its container is up. */
	function noteRequests() {
		return backend.match(NOTE_GAME_URL);
	}

	/**
	 * Waits out the queue's 300ms reset debounce (PLAN.md §5.5), so the batch
	 * fetched for the *saved* settings has been issued. Real time rather than
	 * fake timers: the reset also crosses `toObservable`'s change-detection
	 * hop, which fake timers do not advance.
	 */
	async function settleQueueReset(): Promise<void> {
		await new Promise((resolve) => setTimeout(resolve, 400));
		await fixture.whenStable();
	}

	it("renders the settings bar and the answer pad before the first answer", async () => {
		await render();
		await hydrate(null);

		expect(el().textContent).toContain("time");
		expect(el().textContent).toContain("notes");
		// 21 answer buttons plus the keyboard-bindings button.
		expect(el().querySelectorAll("button").length).toBeGreaterThanOrEqual(22);

		noteRequests().forEach((r) =>
			r.flush({}, { status: 500, statusText: "x" }),
		);
	});

	it("treats a first-ever visit (404, no row) as defaults, not an error", async () => {
		await render();
		backend
			.expectOne(SETTINGS_URL)
			.flush(null, { status: 404, statusText: "Not Found" });
		backend
			.expectOne(BINDINGS_URL)
			.flush(null, { status: 404, statusText: "Not Found" });
		await fixture.whenStable();
		fixture.detectChanges();

		// The default range, unchanged.
		expect(el().textContent).toContain("C4–C6");

		noteRequests().forEach((r) =>
			r.flush({}, { status: 500, statusText: "x" }),
		);
	});

	// `resource.value()` rethrows once the resource has errored, and
	// `noteToKeyMap` is read three times in the template -- so an unguarded
	// read makes a failed bindings fetch a crashed game screen rather than a
	// missing convenience.
	it("still renders, on the default bindings, when the bindings fetch fails", async () => {
		await render();
		backend
			.expectOne(SETTINGS_URL)
			.flush(null, { status: 404, statusText: "Not Found" });
		backend
			.expectOne(BINDINGS_URL)
			.flush({ message: "boom" }, { status: 500, statusText: "Server Error" });
		await fixture.whenStable();
		fixture.detectChanges();
		await fixture.whenStable();

		// The whole screen is up: settings bar, answer pad, staff.
		expect(el().textContent).toContain("time");
		expect(el().querySelectorAll("button").length).toBeGreaterThanOrEqual(22);
		// And the hints under the answer buttons are the defaults, not blank:
		// "a" under C, "j" under B.
		const padButton = (label: string): Element | undefined =>
			[...el().querySelectorAll("app-button")].find(
				(b) => b.querySelector("span")?.textContent?.trim() === label,
			);
		expect(padButton("C")?.textContent?.replace(/\s+/g, "")).toBe("Ca");
		expect(padButton("B")?.textContent?.replace(/\s+/g, "")).toBe("Bj");

		noteRequests().forEach((r) =>
			r.flush({}, { status: 500, statusText: "x" }),
		);
	});

	describe("a legacy saved row", () => {
		it("loads without breaking, and the range is what plays", async () => {
			await render();
			await hydrate(LEGACY_ROW);

			// The saved settings reached the UI.
			expect(el().textContent).toContain("C4–C6");

			// The board starts prefetching on the defaults while the saved row
			// is still in flight. When it lands, the buffer is emptied at once
			// -- React's own note, "no stale question can be served in the
			// meantime" -- and the superseded batch is unsubscribed when the
			// 300ms reset debounce fires. That last part is PLAN.md §5.5's
			// `switchMap` making it a real cancellation, where React let the
			// superseded promises resolve and threw the results away.
			const initial = noteRequests();
			expect(initial.length).toBeGreaterThan(0);

			await settleQueueReset();
			expect(initial.every((request) => request.cancelled)).toBe(true);

			const requests = noteRequests();
			expect(requests.length).toBeGreaterThan(0);

			for (const request of requests) {
				const body = request.request.body as Record<string, unknown>;
				// The range, not the octave, decides which pitches appear --
				// the octave is sent only because the endpoint still accepts
				// it and the row still carries it.
				expect(body["lowNote"]).toBe("C4");
				expect(body["highNote"]).toBe("C6");
				expect(body["clef"]).toBe("treble");
				expect(body["octave"]).toBe("2");
				// "G Major" -> tonic "G", music21 spelling.
				expect(body["scale"]).toBe("G");
				request.flush({}, { status: 500, statusText: "x" });
			}
		});

		it("does not let the octave override the clef's default range", async () => {
			await render();
			await hydrate({
				...LEGACY_ROW,
				low_note: "E2",
				high_note: "E4",
				clef: "bass",
			});

			expect(el().textContent).toContain("E2–E4");

			// The default-settings batch, cancelled by the reset.
			expect(noteRequests().length).toBeGreaterThan(0);
			await settleQueueReset();

			const requests = noteRequests();
			expect(requests.length).toBeGreaterThan(0);
			for (const request of requests) {
				const body = request.request.body as Record<string, unknown>;
				expect(body["clef"]).toBe("bass");
				expect(body["lowNote"]).toBe("E2");
				expect(body["highNote"]).toBe("E4");
				request.flush({}, { status: 500, statusText: "x" });
			}
		});
	});

	it("saves nothing until the game actually starts", async () => {
		await render();
		await hydrate(null);

		// Clicking settings must not write anything -- settings.spec.ts's
		// whole point. Switch to notes mode via the bar.
		const notes = [...el().querySelectorAll("button")].find(
			(b) => b.textContent?.trim() === "notes",
		);
		notes?.click();
		fixture.detectChanges();
		await fixture.whenStable();

		backend.expectNone(
			(req) => req.url === SETTINGS_URL && req.method === "PUT",
		);

		noteRequests().forEach((r) =>
			r.flush({}, { status: 500, statusText: "x" }),
		);
	});

	describe("overlap_accidentals", () => {
		/** A saved row's `key_bindings`, as the wire shape expects it. */
		const DEFAULT_KEY_BINDINGS = noteMapToKeyBindings(DEFAULT_NOTE_TO_KEY_MAP);

		function padButton(label: string): Element | undefined {
			return [...el().querySelectorAll("app-button")].find(
				(b) => b.querySelector("span")?.textContent?.trim() === label,
			);
		}

		async function hydrateOverlap(): Promise<void> {
			backend
				.expectOne(SETTINGS_URL)
				.flush(null, { status: 404, statusText: "Not Found" });
			backend.expectOne(BINDINGS_URL).flush(
				{
					id: 8,
					user_id: 7,
					key_bindings: DEFAULT_KEY_BINDINGS,
					overlap_accidentals: true,
				},
				{ status: 200, statusText: "OK" },
			);
			await fixture.whenStable();
			fixture.detectChanges();
			await fixture.whenStable();
		}

		it("switches the answer-pad hints to the piano layout", async () => {
			await render();
			await hydrateOverlap();

			// Db has no key of its own under the layout -- it borrows C#'s
			// fixed "w", not the bottom-row key it is still bound to.
			expect(padButton("Db")?.textContent?.replace(/\s+/g, "")).toBe("Dbw");
			// The natural C is unaffected: it keeps its real key.
			expect(padButton("C")?.textContent?.replace(/\s+/g, "")).toBe("Ca");

			noteRequests().forEach((r) =>
				r.flush({}, { status: 500, statusText: "x" }),
			);
		});

		it("round-trips the saved flag into the bindings dialog's toggle", async () => {
			await render();
			await hydrateOverlap();

			const openBindings = [...el().querySelectorAll("button")].find(
				(b) => b.getAttribute("aria-label") === "Configure keyboard bindings",
			);
			openBindings?.click();
			fixture.detectChanges();
			await fixture.whenStable();

			const toggle = [...el().querySelectorAll("button")].find((b) =>
				["On", "Off"].includes(b.textContent?.trim() ?? ""),
			);
			expect(toggle?.textContent?.trim()).toBe("On");

			noteRequests().forEach((r) =>
				r.flush({}, { status: 500, statusText: "x" }),
			);
		});
	});
});

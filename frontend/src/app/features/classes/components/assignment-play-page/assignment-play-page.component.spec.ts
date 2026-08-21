import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { provideIcons } from "@ng-icons/core";

import { environment } from "../../../../../environments/environment";
import { TREMOLO_ICONS } from "../../../../core/icons";
import { AssignmentPlayPageComponent } from "./assignment-play-page.component";

const ASSIGNMENTS_URL = `${environment.mainApi}/api/assignments`;

const ASSIGNMENT = {
	id: 3,
	class_id: 1,
	title: "Week 1: Treble Notes",
	game_type: "key_signature" as const,
	config: { gameMode: "notes", noteLimit: 10 },
	due_at: null,
	target_questions: null,
	target_accuracy: null,
	created_at: "2026-07-12T04:10:00Z",
	class_name: "Symphonic Band",
	attempt_count: 0,
	best_correct: 0,
	best_accuracy: 0,
};

/**
 * The play page's own plumbing, which is what this slice owns: resolve the
 * `:id`, find the assignment in the student's list (there is no
 * GET-by-id), and either hand off or show not-found. The game behind the
 * handoff is Phases 5/6 -- see `AssignmentGameHostComponent`.
 */
describe("AssignmentPlayPageComponent", () => {
	let fixture: ComponentFixture<AssignmentPlayPageComponent>;
	let backend: HttpTestingController;

	async function render(id: string): Promise<void> {
		TestBed.configureTestingModule({
			providers: [
				provideRouter([]),
				provideHttpClient(),
				provideHttpClientTesting(),
				provideIcons(TREMOLO_ICONS),
			],
		});
		backend = TestBed.inject(HttpTestingController);
		fixture = TestBed.createComponent(AssignmentPlayPageComponent);
		fixture.componentRef.setInput("id", id);
		// See the note in `classes-page.component.spec.ts`: `whenStable()`
		// waits for the resource's request, so render first and await later.
		fixture.detectChanges();
		await Promise.resolve();
	}

	afterEach(() => {
		// Since Phase 5 the host renders a real game, and a real game
		// immediately prefetches two questions from the music service. Those
		// are the engine's business, not this page's; draining them keeps
		// `verify()` meaning "no stray *assignment* request".
		backend.match((request) => request.url.startsWith(environment.musicApi));
		backend.verify();
		vi.restoreAllMocks();
	});

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	async function flush(body: object): Promise<void> {
		backend.expectOne(ASSIGNMENTS_URL).flush(body);
		await fixture.whenStable();
	}

	it("shows skeletons, not 'not found', while the list is in flight", async () => {
		await render("3");

		expect(el().textContent).not.toContain("Assignment not found");

		await flush([ASSIGNMENT]);
	});

	it("hands the assignment off to the game host with a back link", async () => {
		await render("3");
		await flush([ASSIGNMENT]);

		expect(el().textContent).toContain("Back to assignments");
		expect(el().querySelector("app-assignment-game-host")).toBeTruthy();
		expect(el().textContent).not.toContain("Assignment not found");
		// The host resolves `key_signature` to the real shell, in assignment
		// mode. Before Phase 5 this was a placeholder notice.
		expect(el().querySelector("app-identification-game")).toBeTruthy();
		expect(el().textContent).not.toContain("not available in this build");
	});

	it("shows not-found when the id is not in the student's list", async () => {
		await render("999");
		await flush([ASSIGNMENT]);

		expect(el().textContent).toContain("Assignment not found");
		expect(el().querySelector("app-assignment-game-host")).toBeNull();
	});

	it("shows not-found for a non-numeric id", async () => {
		await render("banana");
		await flush([ASSIGNMENT]);

		expect(el().textContent).toContain("Assignment not found");
	});

	it("offers a way back from not-found", async () => {
		await render("999");
		await flush([]);

		const link = el().querySelector("a") as HTMLAnchorElement;
		expect(link.getAttribute("href")).toBe("/assignments");
		expect(link.textContent).toContain("Back to assignments");
	});

	// `game_type` is filled by the Go service, so the `GameType` union is a
	// claim about the wire rather than a guarantee from it. React fell
	// through to not-found when its definition lookup missed; without the
	// same guard the host renders a game with a blank name.
	it("shows not-found for a game type this build does not know", async () => {
		await render("3");
		await flush([{ ...ASSIGNMENT, game_type: "theremin" }]);

		expect(el().textContent).toContain("Assignment not found");
		expect(el().querySelector("app-assignment-game-host")).toBeNull();
	});
});

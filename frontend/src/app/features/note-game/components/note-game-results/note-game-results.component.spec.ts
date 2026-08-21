import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { provideIcons } from "@ng-icons/core";

import { environment } from "../../../../../environments/environment";
import { AuthStore } from "../../../../auth/services/auth.store";
import { TREMOLO_ICONS } from "../../../../core/icons";
import { GameMode } from "@features/identification-game/data";
import type { NoteGameStats } from "../../models/note-game.models";
import { NoteGameResultsComponent } from "./note-game-results.component";

const RECENT_URL = `${environment.mainApi}/api/note-game/recent`;

const STATS: NoteGameStats = {
	npm: 12,
	accuracy: 80,
	correct: 8,
	total: 10,
	gameMode: GameMode.Notes,
	limit: 10,
	scale: "C Major",
};

/** One row of `GET /api/note-game/recent`, wire-shaped. */
function entry(id: number): Record<string, unknown> {
	return {
		id,
		user_id: 7,
		time_length: "00:01:00",
		total_questions: 10,
		correct_questions: 8,
		notes_per_minute: 10 + id,
		created_date: "2026-08-20T04:00:00Z",
	};
}

/**
 * The results screen's own resource. The chart is a bonus on top of a
 * finished game -- the score is already saved by the time this renders --
 * so a failed recent-games fetch has to degrade to a notice, never to a
 * blank screen.
 */
describe("NoteGameResultsComponent", () => {
	let fixture: ComponentFixture<NoteGameResultsComponent>;
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
		fixture = TestBed.createComponent(NoteGameResultsComponent);
		fixture.componentRef.setInput("gameStats", STATS);
		fixture.detectChanges();
		await Promise.resolve();
	}

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	it("charts the recent games once two have come back", async () => {
		await render();
		backend.expectOne(RECENT_URL).flush([entry(1), entry(2)]);
		await fixture.whenStable();
		fixture.detectChanges();

		expect(el().textContent).toContain("Recent Games");
		expect(el().querySelector("app-tremolo-line-chart")).toBeTruthy();
	});

	// `resource.value()` rethrows once the resource has errored, and the
	// "Could not load recent games" notice is a *sibling* of the chart rather
	// than a gate on it -- so an unguarded `chartData()` takes the whole
	// results screen down instead of showing that notice.
	it("shows the friendly notice, and still the score, when the fetch fails", async () => {
		await render();
		backend
			.expectOne(RECENT_URL)
			.flush({ message: "boom" }, { status: 500, statusText: "Server Error" });
		await fixture.whenStable();
		fixture.detectChanges();

		expect(el().textContent).toContain("Could not load recent games");
		// The save succeeded, so the notice says so and no save error shows.
		expect(el().textContent).toContain("Your result was still saved.");
		expect(el().textContent).not.toContain("could not be saved");
		// The card itself is intact, and the chart is simply absent.
		expect(el().querySelector("app-game-over-card")).toBeTruthy();
		expect(el().textContent).toContain("Scale: C Major");
		expect(el().querySelector("app-tremolo-line-chart")).toBeNull();
		expect(el().textContent).not.toContain("Recent Games");
	});
});

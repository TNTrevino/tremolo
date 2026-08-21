import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { provideIcons } from "@ng-icons/core";

import { environment } from "../../../../../environments/environment";
import { TREMOLO_ICONS } from "../../../../core/icons";
import { defaultAssignmentConfig } from "../../models/game-definitions";
import { CreateAssignmentDialogComponent } from "./create-assignment-dialog.component";

const CREATE_URL = `${environment.mainApi}/api/classes/7/assignments`;

/**
 * Port of
 * frontend-react/src/features/classes/components/CreateAssignmentDialog.test.tsx.
 *
 * The React test's real assertion is the shape of the request: top-level
 * fields snake_case, the `config` blob the chosen game's defaults
 * **verbatim** (camelCase for the identification games). That is exactly
 * what the Go service stores and what the game later reads back, so it is
 * the contract worth pinning even while the settings controls themselves
 * are still Phase 5/6 work.
 */
describe("CreateAssignmentDialogComponent", () => {
	let fixture: ComponentFixture<CreateAssignmentDialogComponent>;
	let backend: HttpTestingController;

	beforeEach(async () => {
		TestBed.configureTestingModule({
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				provideIcons(TREMOLO_ICONS),
			],
		});
		backend = TestBed.inject(HttpTestingController);
		fixture = TestBed.createComponent(CreateAssignmentDialogComponent);
		fixture.componentRef.setInput("classId", 7);
		fixture.componentRef.setInput("open", true);
		await fixture.whenStable();
	});

	afterEach(() => {
		backend.verify();
		vi.restoreAllMocks();
	});

	function el(): HTMLElement {
		return fixture.nativeElement as HTMLElement;
	}

	async function type(id: string, value: string): Promise<void> {
		const input = el().querySelector(`#${id}`) as HTMLInputElement;
		input.value = value;
		input.dispatchEvent(new Event("input"));
		await fixture.whenStable();
	}

	async function chooseGame(value: string): Promise<void> {
		const select = el().querySelector(
			"#assignment-game-type",
		) as HTMLSelectElement;
		select.value = value;
		select.dispatchEvent(new Event("change"));
		await fixture.whenStable();
	}

	async function submit(): Promise<void> {
		(el().querySelector("form") as HTMLFormElement).dispatchEvent(
			new Event("submit", { cancelable: true }),
		);
		await fixture.whenStable();
	}

	it("requires a title before submitting", async () => {
		await submit();

		backend.expectNone(CREATE_URL);
		expect(el().textContent).toContain("Title is required");
	});

	it("builds a request with snake_case fields and the game's own config", async () => {
		await type("assignment-title", "Scale drills");
		await chooseGame("scale");

		await submit();
		const post = backend.expectOne(CREATE_URL);

		expect(post.request.body).toEqual({
			title: "Scale drills",
			game_type: "scale",
			config: defaultAssignmentConfig("scale"),
			due_at: null,
			target_questions: null,
			target_accuracy: null,
		});

		post.flush({
			id: 9,
			class_id: 7,
			title: "Scale drills",
			game_type: "scale",
			config: defaultAssignmentConfig("scale"),
			due_at: null,
			target_questions: null,
			target_accuracy: null,
			created_at: "2026-07-12T04:10:00Z",
		});
		await fixture.whenStable();
	});

	it("snapshots the newly chosen game's defaults when the game changes", async () => {
		await chooseGame("key_signature");
		await chooseGame("chord");
		await type("assignment-title", "Chords");

		await submit();
		const post = backend.expectOne(CREATE_URL);

		expect(post.request.body).toMatchObject({
			game_type: "chord",
			config: defaultAssignmentConfig("chord"),
		});
		post.flush({
			id: 9,
			class_id: 7,
			title: "Chords",
			game_type: "chord",
			config: {},
			due_at: null,
			target_questions: null,
			target_accuracy: null,
			created_at: "2026-07-12T04:10:00Z",
		});
		await fixture.whenStable();
	});

	it("sends the optional targets as numbers and the due date as an ISO string", async () => {
		await type("assignment-title", "Week 1");
		await type("assignment-target-q", "20");
		await type("assignment-target-a", "80");
		await type("assignment-due", "2026-07-20T09:00");

		await submit();
		const post = backend.expectOne(CREATE_URL);
		const body = post.request.body as Record<string, unknown>;

		expect(body["target_questions"]).toBe(20);
		expect(body["target_accuracy"]).toBe(80);
		expect(typeof body["due_at"]).toBe("string");
		expect(body["due_at"]).toContain("2026-07-20");

		post.flush({
			id: 9,
			class_id: 7,
			title: "Week 1",
			game_type: "note",
			config: {},
			due_at: null,
			target_questions: 20,
			target_accuracy: 80,
			created_at: "2026-07-12T04:10:00Z",
		});
		await fixture.whenStable();
	});

	it("rejects a target accuracy outside 1-100", async () => {
		// React expressed this as `min={1} max={100}` on the input; Signal Forms
		// owns those attributes on a bound control, so the rule moved into the
		// schema and now says so in words.
		await type("assignment-title", "Week 1");
		await type("assignment-target-a", "140");

		await submit();

		backend.expectNone(CREATE_URL);
		expect(el().textContent).toContain(
			"Target accuracy must be between 1 and 100",
		);
	});
});

import { provideHttpClient } from "@angular/common/http";
import {
	HttpTestingController,
	provideHttpClientTesting,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";

import { environment } from "../../../../environments/environment";
import type {
	Assignment,
	AssignmentResponse,
	AssignmentResult,
	AssignmentResultRow,
	Attempt,
	AttemptResponse,
	Class,
	ClassResponse,
	MessageResponse,
	RosterEntry,
	RosterEntryResponse,
	StudentAssignment,
	StudentAssignmentResponse,
	StudentClass,
	StudentClassResponse,
} from "../models/classes.models";
import { ClassesService } from "./classes.service";

/**
 * Port of frontend-react/src/services/api/classes.service.test.ts, case for
 * case. React mocked an axios instance and asserted on the recorded call;
 * `HttpTestingController` is the same assertion in Angular's idiom -- the
 * URL and body are read off the intercepted request, and `backend.verify()`
 * turns "called the wrong endpoint" into a failure without a spy.
 *
 * What is under test is the mapping contract at the service boundary (D5,
 * PLAN.md §5.1): snake_case in, camelCase out, on every method.
 */

const CLASSES = `${environment.mainApi}/api/classes`;
const ASSIGNMENTS = `${environment.mainApi}/api/assignments`;

describe("ClassesService", () => {
	let service: ClassesService;
	let backend: HttpTestingController;

	beforeEach(() => {
		TestBed.configureTestingModule({
			providers: [provideHttpClient(), provideHttpClientTesting()],
		});
		service = TestBed.inject(ClassesService);
		backend = TestBed.inject(HttpTestingController);
	});

	afterEach(() => backend.verify());

	it("maps ClassResponse to Class on createClass", () => {
		const response: ClassResponse = {
			id: 1,
			name: "Symphonic Band",
			join_code: "7NZJN3",
			student_count: 12,
			created_at: "2026-07-12T04:00:00Z",
		};
		let result: Class | undefined;

		service.createClass("Symphonic Band").subscribe((c) => (result = c));

		const request = backend.expectOne(CLASSES);
		expect(request.request.method).toBe("POST");
		expect(request.request.body).toEqual({ name: "Symphonic Band" });
		request.flush(response);

		expect(result).toEqual({
			id: 1,
			name: "Symphonic Band",
			joinCode: "7NZJN3",
			studentCount: 12,
			createdAt: "2026-07-12T04:00:00Z",
		});
	});

	it("maps ClassResponse[] to Class[] on getTeacherClasses", () => {
		const response: ClassResponse[] = [
			{
				id: 1,
				name: "Symphonic Band",
				join_code: "7NZJN3",
				student_count: 12,
				created_at: "2026-07-12T04:00:00Z",
			},
		];
		let result: Class[] | undefined;

		service.getTeacherClasses().subscribe((c) => (result = c));

		const request = backend.expectOne(CLASSES);
		expect(request.request.method).toBe("GET");
		request.flush(response);

		expect(result).toEqual([
			{
				id: 1,
				name: "Symphonic Band",
				joinCode: "7NZJN3",
				studentCount: 12,
				createdAt: "2026-07-12T04:00:00Z",
			},
		]);
	});

	it("maps StudentClassResponse[] to StudentClass[] on getStudentClasses", () => {
		const response: StudentClassResponse[] = [
			{ id: 1, name: "Symphonic Band", teacher_name: "Terry Director" },
		];
		let result: StudentClass[] | undefined;

		service.getStudentClasses().subscribe((c) => (result = c));

		backend.expectOne(`${CLASSES}/joined`).flush(response);

		expect(result).toEqual([
			{ id: 1, name: "Symphonic Band", teacherName: "Terry Director" },
		]);
	});

	it("maps StudentClassResponse to StudentClass on joinClass", () => {
		const response: StudentClassResponse = {
			id: 1,
			name: "Symphonic Band",
			teacher_name: "Terry Director",
		};
		let result: StudentClass | undefined;

		// Lowercase on purpose: the code is passed through verbatim, the Go
		// service does the case-insensitive lookup.
		service.joinClass("7nzjn3").subscribe((c) => (result = c));

		const request = backend.expectOne(`${CLASSES}/join`);
		expect(request.request.method).toBe("POST");
		expect(request.request.body).toEqual({ join_code: "7nzjn3" });
		request.flush(response);

		expect(result).toEqual({
			id: 1,
			name: "Symphonic Band",
			teacherName: "Terry Director",
		});
	});

	it("maps RosterEntryResponse[] to RosterEntry[] on getClassRoster", () => {
		const response: RosterEntryResponse[] = [
			{
				student_id: 42,
				first_name: "Sam",
				last_name: "Student",
				joined_at: "2026-07-12T04:05:00Z",
			},
		];
		let result: RosterEntry[] | undefined;

		service.getClassRoster(1).subscribe((r) => (result = r));

		backend.expectOne(`${CLASSES}/1/roster`).flush(response);

		expect(result).toEqual([
			{
				studentId: 42,
				firstName: "Sam",
				lastName: "Student",
				joinedAt: "2026-07-12T04:05:00Z",
			},
		]);
	});

	it("passes through archiveClass response", () => {
		let result: MessageResponse | undefined;

		service.archiveClass(1).subscribe((r) => (result = r));

		const request = backend.expectOne(`${CLASSES}/1`);
		expect(request.request.method).toBe("DELETE");
		request.flush({ message: "archived" });

		expect(result).toEqual({ message: "archived" });
	});

	it("removeStudent hits the nested delete route", () => {
		let result: MessageResponse | undefined;

		service.removeStudent(1, 42).subscribe((r) => (result = r));

		const request = backend.expectOne(`${CLASSES}/1/students/42`);
		expect(request.request.method).toBe("DELETE");
		request.flush({ message: "removed" });

		expect(result).toEqual({ message: "removed" });
	});

	it("maps AssignmentResponse to Assignment on createAssignment", () => {
		const response: AssignmentResponse = {
			id: 3,
			class_id: 1,
			title: "Week 1: Treble Notes",
			game_type: "note",
			config: { scale: "C", clef: "treble" },
			due_at: "2026-07-20T00:00:00Z",
			target_questions: null,
			target_accuracy: 80,
			created_at: "2026-07-12T04:10:00Z",
		};
		let result: Assignment | undefined;

		service
			.createAssignment(1, {
				title: "Week 1: Treble Notes",
				game_type: "note",
				config: { scale: "C", clef: "treble" },
				due_at: "2026-07-20T00:00:00Z",
				target_accuracy: 80,
			})
			.subscribe((a) => (result = a));

		const request = backend.expectOne(`${CLASSES}/1/assignments`);
		expect(request.request.method).toBe("POST");
		expect(request.request.body).toMatchObject({
			title: "Week 1: Treble Notes",
		});
		request.flush(response);

		expect(result).toEqual({
			id: 3,
			classId: 1,
			title: "Week 1: Treble Notes",
			gameType: "note",
			config: { scale: "C", clef: "treble" },
			dueAt: "2026-07-20T00:00:00Z",
			targetQuestions: null,
			targetAccuracy: 80,
			createdAt: "2026-07-12T04:10:00Z",
		});
	});

	it("maps AssignmentResponse[] to Assignment[] on getClassAssignments", () => {
		const response: AssignmentResponse[] = [
			{
				id: 3,
				class_id: 1,
				title: "Week 1: Treble Notes",
				game_type: "note",
				config: {},
				due_at: null,
				target_questions: 20,
				target_accuracy: null,
				created_at: "2026-07-12T04:10:00Z",
			},
		];
		let result: Assignment[] | undefined;

		service.getClassAssignments(1).subscribe((a) => (result = a));

		backend.expectOne(`${CLASSES}/1/assignments`).flush(response);

		expect(result).toEqual([
			{
				id: 3,
				classId: 1,
				title: "Week 1: Treble Notes",
				gameType: "note",
				config: {},
				dueAt: null,
				targetQuestions: 20,
				targetAccuracy: null,
				createdAt: "2026-07-12T04:10:00Z",
			},
		]);
	});

	it("maps StudentAssignmentResponse[] to StudentAssignment[] on getStudentAssignments", () => {
		const response: StudentAssignmentResponse[] = [
			{
				id: 3,
				class_id: 1,
				title: "Week 1: Treble Notes",
				game_type: "note",
				config: { scale: "C" },
				due_at: null,
				target_questions: null,
				target_accuracy: 80,
				created_at: "2026-07-12T04:10:00Z",
				class_name: "Symphonic Band",
				attempt_count: 1,
				best_correct: 15,
				best_accuracy: 75,
			},
		];
		let result: StudentAssignment[] | undefined;

		service.getStudentAssignments().subscribe((a) => (result = a));

		backend.expectOne(ASSIGNMENTS).flush(response);

		expect(result).toEqual([
			{
				id: 3,
				classId: 1,
				title: "Week 1: Treble Notes",
				gameType: "note",
				config: { scale: "C" },
				dueAt: null,
				targetQuestions: null,
				targetAccuracy: 80,
				createdAt: "2026-07-12T04:10:00Z",
				className: "Symphonic Band",
				attemptCount: 1,
				bestCorrect: 15,
				bestAccuracy: 75,
			},
		]);
	});

	it("maps AssignmentResultRow[] to AssignmentResult[] on getAssignmentResults", () => {
		const response: AssignmentResultRow[] = [
			{
				student_id: 42,
				first_name: "Sam",
				last_name: "Student",
				attempt_count: 1,
				best_correct: 15,
				most_questions: 20,
				best_accuracy: 75,
				last_attempt_date: "2026-07-12",
			},
			{
				student_id: 43,
				first_name: "Jo",
				last_name: "Notyet",
				attempt_count: 0,
				best_correct: 0,
				most_questions: 0,
				best_accuracy: 0,
				last_attempt_date: "",
			},
		];
		let result: AssignmentResult[] | undefined;

		service.getAssignmentResults(3).subscribe((r) => (result = r));

		backend.expectOne(`${ASSIGNMENTS}/3/results`).flush(response);

		expect(result).toEqual([
			{
				studentId: 42,
				firstName: "Sam",
				lastName: "Student",
				attemptCount: 1,
				bestCorrect: 15,
				mostQuestions: 20,
				bestAccuracy: 75,
				lastAttemptDate: "2026-07-12",
			},
			{
				studentId: 43,
				firstName: "Jo",
				lastName: "Notyet",
				attemptCount: 0,
				bestCorrect: 0,
				mostQuestions: 0,
				bestAccuracy: 0,
				lastAttemptDate: "",
			},
		]);
	});

	it("passes through deleteAssignment response", () => {
		let result: MessageResponse | undefined;

		service.deleteAssignment(3).subscribe((r) => (result = r));

		const request = backend.expectOne(`${ASSIGNMENTS}/3`);
		expect(request.request.method).toBe("DELETE");
		request.flush({ message: "deleted" });

		expect(result).toEqual({ message: "deleted" });
	});

	it("maps AttemptResponse[] to Attempt[] on getAssignmentAttempts", () => {
		const response: AttemptResponse[] = [
			{
				correct_questions: 13,
				total_questions: 14,
				accuracy: 92,
				notes_per_minute: 80,
				attempted_date: "2026-07-12",
			},
		];
		let result: Attempt[] | undefined;

		service.getAssignmentAttempts(3, 42).subscribe((a) => (result = a));

		backend.expectOne(`${ASSIGNMENTS}/3/attempts/42`).flush(response);

		expect(result).toEqual([
			{
				correctQuestions: 13,
				totalQuestions: 14,
				accuracy: 92,
				notesPerMinute: 80,
				attemptedDate: "2026-07-12",
			},
		]);
	});
});

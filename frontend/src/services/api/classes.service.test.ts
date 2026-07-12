import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AxiosInstance } from "axios";
import { ClassesService } from "./classes.service";
import type {
	ClassResponse,
	StudentClassResponse,
	RosterEntryResponse,
	AssignmentResponse,
	StudentAssignmentResponse,
	AssignmentResultRow,
	AttemptResponse,
} from "./types";

function createMockClient() {
	return {
		get: vi.fn(),
		post: vi.fn(),
		delete: vi.fn(),
	} as unknown as AxiosInstance & {
		get: ReturnType<typeof vi.fn>;
		post: ReturnType<typeof vi.fn>;
		delete: ReturnType<typeof vi.fn>;
	};
}

describe("ClassesService", () => {
	let client: ReturnType<typeof createMockClient>;
	let service: ClassesService;

	beforeEach(() => {
		client = createMockClient();
		service = new ClassesService(client);
	});

	it("maps ClassResponse to Class on createClass", async () => {
		const response: ClassResponse = {
			id: 1,
			name: "Symphonic Band",
			join_code: "7NZJN3",
			student_count: 12,
			created_at: "2026-07-12T04:00:00Z",
		};
		client.post.mockResolvedValue({ data: response });

		const result = await service.createClass("Symphonic Band");

		expect(client.post).toHaveBeenCalledWith("/api/classes", {
			name: "Symphonic Band",
		});
		expect(result).toEqual({
			id: 1,
			name: "Symphonic Band",
			joinCode: "7NZJN3",
			studentCount: 12,
			createdAt: "2026-07-12T04:00:00Z",
		});
	});

	it("maps ClassResponse[] to Class[] on getTeacherClasses", async () => {
		const response: ClassResponse[] = [
			{
				id: 1,
				name: "Symphonic Band",
				join_code: "7NZJN3",
				student_count: 12,
				created_at: "2026-07-12T04:00:00Z",
			},
		];
		client.get.mockResolvedValue({ data: response });

		const result = await service.getTeacherClasses();

		expect(client.get).toHaveBeenCalledWith("/api/classes");
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

	it("maps StudentClassResponse[] to StudentClass[] on getStudentClasses", async () => {
		const response: StudentClassResponse[] = [
			{ id: 1, name: "Symphonic Band", teacher_name: "Terry Director" },
		];
		client.get.mockResolvedValue({ data: response });

		const result = await service.getStudentClasses();

		expect(client.get).toHaveBeenCalledWith("/api/classes/joined");
		expect(result).toEqual([
			{ id: 1, name: "Symphonic Band", teacherName: "Terry Director" },
		]);
	});

	it("maps StudentClassResponse to StudentClass on joinClass", async () => {
		const response: StudentClassResponse = {
			id: 1,
			name: "Symphonic Band",
			teacher_name: "Terry Director",
		};
		client.post.mockResolvedValue({ data: response });

		const result = await service.joinClass("7nzjn3");

		expect(client.post).toHaveBeenCalledWith("/api/classes/join", {
			join_code: "7nzjn3",
		});
		expect(result).toEqual({
			id: 1,
			name: "Symphonic Band",
			teacherName: "Terry Director",
		});
	});

	it("maps RosterEntryResponse[] to RosterEntry[] on getClassRoster", async () => {
		const response: RosterEntryResponse[] = [
			{
				student_id: 42,
				first_name: "Sam",
				last_name: "Student",
				joined_at: "2026-07-12T04:05:00Z",
			},
		];
		client.get.mockResolvedValue({ data: response });

		const result = await service.getClassRoster(1);

		expect(client.get).toHaveBeenCalledWith("/api/classes/1/roster");
		expect(result).toEqual([
			{
				studentId: 42,
				firstName: "Sam",
				lastName: "Student",
				joinedAt: "2026-07-12T04:05:00Z",
			},
		]);
	});

	it("passes through archiveClass response", async () => {
		client.delete.mockResolvedValue({ data: { message: "archived" } });

		const result = await service.archiveClass(1);

		expect(client.delete).toHaveBeenCalledWith("/api/classes/1");
		expect(result).toEqual({ message: "archived" });
	});

	it("removeStudent hits the nested delete route", async () => {
		client.delete.mockResolvedValue({ data: { message: "removed" } });

		const result = await service.removeStudent(1, 42);

		expect(client.delete).toHaveBeenCalledWith("/api/classes/1/students/42");
		expect(result).toEqual({ message: "removed" });
	});

	it("maps AssignmentResponse to Assignment on createAssignment", async () => {
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
		client.post.mockResolvedValue({ data: response });

		const result = await service.createAssignment(1, {
			title: "Week 1: Treble Notes",
			game_type: "note",
			config: { scale: "C", clef: "treble" },
			due_at: "2026-07-20T00:00:00Z",
			target_accuracy: 80,
		});

		expect(client.post).toHaveBeenCalledWith(
			"/api/classes/1/assignments",
			expect.objectContaining({ title: "Week 1: Treble Notes" }),
		);
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

	it("maps AssignmentResponse[] to Assignment[] on getClassAssignments", async () => {
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
		client.get.mockResolvedValue({ data: response });

		const result = await service.getClassAssignments(1);

		expect(client.get).toHaveBeenCalledWith("/api/classes/1/assignments");
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

	it("maps StudentAssignmentResponse[] to StudentAssignment[] on getStudentAssignments", async () => {
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
		client.get.mockResolvedValue({ data: response });

		const result = await service.getStudentAssignments();

		expect(client.get).toHaveBeenCalledWith("/api/assignments");
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

	it("maps AssignmentResultRow[] to AssignmentResult[] on getAssignmentResults", async () => {
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
		client.get.mockResolvedValue({ data: response });

		const result = await service.getAssignmentResults(3);

		expect(client.get).toHaveBeenCalledWith("/api/assignments/3/results");
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

	it("passes through deleteAssignment response", async () => {
		client.delete.mockResolvedValue({ data: { message: "deleted" } });

		const result = await service.deleteAssignment(3);

		expect(client.delete).toHaveBeenCalledWith("/api/assignments/3");
		expect(result).toEqual({ message: "deleted" });
	});

	it("maps AttemptResponse[] to Attempt[] on getAssignmentAttempts", async () => {
		const response: AttemptResponse[] = [
			{
				correct_questions: 13,
				total_questions: 14,
				accuracy: 92,
				notes_per_minute: 80,
				attempted_date: "2026-07-12",
			},
		];
		client.get.mockResolvedValue({ data: response });

		const result = await service.getAssignmentAttempts(3, 42);

		expect(client.get).toHaveBeenCalledWith("/api/assignments/3/attempts/42");
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

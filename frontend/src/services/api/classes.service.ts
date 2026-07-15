import type { AxiosInstance } from "axios";
import type {
	ClassResponse,
	StudentClassResponse,
	RosterEntryResponse,
	AssignmentResponse,
	StudentAssignmentResponse,
	AssignmentResultRow,
	CreateClassRequest,
	JoinClassRequest,
	CreateAssignmentRequest,
	AttemptResponse,
} from "./types";
import type {
	Class,
	StudentClass,
	RosterEntry,
	Assignment,
	StudentAssignment,
	AssignmentResult,
	Attempt,
} from "@/features/classes/types";

export class ClassesService {
	constructor(private client: AxiosInstance) {}

	private mapClassResponse(response: ClassResponse): Class {
		return {
			id: response.id,
			name: response.name,
			joinCode: response.join_code,
			studentCount: response.student_count,
			createdAt: response.created_at,
		};
	}

	private mapStudentClassResponse(
		response: StudentClassResponse,
	): StudentClass {
		return {
			id: response.id,
			name: response.name,
			teacherName: response.teacher_name,
		};
	}

	private mapRosterEntryResponse(response: RosterEntryResponse): RosterEntry {
		return {
			studentId: response.student_id,
			firstName: response.first_name,
			lastName: response.last_name,
			joinedAt: response.joined_at,
		};
	}

	private mapAssignmentResponse(response: AssignmentResponse): Assignment {
		return {
			id: response.id,
			classId: response.class_id,
			title: response.title,
			gameType: response.game_type,
			config: response.config,
			dueAt: response.due_at,
			targetQuestions: response.target_questions,
			targetAccuracy: response.target_accuracy,
			createdAt: response.created_at,
		};
	}

	private mapStudentAssignmentResponse(
		response: StudentAssignmentResponse,
	): StudentAssignment {
		return {
			...this.mapAssignmentResponse(response),
			className: response.class_name,
			attemptCount: response.attempt_count,
			bestCorrect: response.best_correct,
			bestAccuracy: response.best_accuracy,
		};
	}

	private mapAssignmentResultRow(row: AssignmentResultRow): AssignmentResult {
		return {
			studentId: row.student_id,
			firstName: row.first_name,
			lastName: row.last_name,
			attemptCount: row.attempt_count,
			bestCorrect: row.best_correct,
			mostQuestions: row.most_questions,
			bestAccuracy: row.best_accuracy,
			lastAttemptDate: row.last_attempt_date,
		};
	}

	private mapAttemptResponse(response: AttemptResponse): Attempt {
		return {
			correctQuestions: response.correct_questions,
			totalQuestions: response.total_questions,
			accuracy: response.accuracy,
			notesPerMinute: response.notes_per_minute,
			attemptedDate: response.attempted_date,
		};
	}

	async createClass(name: string): Promise<Class> {
		const request: CreateClassRequest = { name };
		const response = await this.client.post<ClassResponse>(
			"/api/classes",
			request,
		);
		return this.mapClassResponse(response.data);
	}

	async getTeacherClasses(): Promise<Class[]> {
		const response = await this.client.get<ClassResponse[]>("/api/classes");
		return response.data.map((c) => this.mapClassResponse(c));
	}

	async getStudentClasses(): Promise<StudentClass[]> {
		const response = await this.client.get<StudentClassResponse[]>(
			"/api/classes/joined",
		);
		return response.data.map((c) => this.mapStudentClassResponse(c));
	}

	async joinClass(joinCode: string): Promise<StudentClass> {
		const request: JoinClassRequest = { join_code: joinCode };
		const response = await this.client.post<StudentClassResponse>(
			"/api/classes/join",
			request,
		);
		return this.mapStudentClassResponse(response.data);
	}

	async getClassRoster(classId: number): Promise<RosterEntry[]> {
		const response = await this.client.get<RosterEntryResponse[]>(
			`/api/classes/${classId}/roster`,
		);
		return response.data.map((r) => this.mapRosterEntryResponse(r));
	}

	async archiveClass(classId: number): Promise<{ message: string }> {
		const response = await this.client.delete<{ message: string }>(
			`/api/classes/${classId}`,
		);
		return response.data;
	}

	async removeStudent(
		classId: number,
		studentId: number,
	): Promise<{ message: string }> {
		const response = await this.client.delete<{ message: string }>(
			`/api/classes/${classId}/students/${studentId}`,
		);
		return response.data;
	}

	async createAssignment(
		classId: number,
		request: CreateAssignmentRequest,
	): Promise<Assignment> {
		const response = await this.client.post<AssignmentResponse>(
			`/api/classes/${classId}/assignments`,
			request,
		);
		return this.mapAssignmentResponse(response.data);
	}

	async getClassAssignments(classId: number): Promise<Assignment[]> {
		const response = await this.client.get<AssignmentResponse[]>(
			`/api/classes/${classId}/assignments`,
		);
		return response.data.map((a) => this.mapAssignmentResponse(a));
	}

	async getStudentAssignments(): Promise<StudentAssignment[]> {
		const response =
			await this.client.get<StudentAssignmentResponse[]>("/api/assignments");
		return response.data.map((a) => this.mapStudentAssignmentResponse(a));
	}

	async getAssignmentResults(
		assignmentId: number,
	): Promise<AssignmentResult[]> {
		const response = await this.client.get<AssignmentResultRow[]>(
			`/api/assignments/${assignmentId}/results`,
		);
		return response.data.map((r) => this.mapAssignmentResultRow(r));
	}

	async deleteAssignment(assignmentId: number): Promise<{ message: string }> {
		const response = await this.client.delete<{ message: string }>(
			`/api/assignments/${assignmentId}`,
		);
		return response.data;
	}

	async getAssignmentAttempts(
		assignmentId: number,
		studentId: number,
	): Promise<Attempt[]> {
		const response = await this.client.get<AttemptResponse[]>(
			`/api/assignments/${assignmentId}/attempts/${studentId}`,
		);
		return response.data.map((a) => this.mapAttemptResponse(a));
	}
}

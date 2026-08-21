import type { GameType } from "../../../shared/models/game.types";

/**
 * Classes & assignments -- the wire shapes (snake_case, from the Go service)
 * and the domain shapes (camelCase, what components read).
 *
 * Port of frontend-react/src/services/api/types/class.types.ts plus
 * frontend-react/src/features/classes/types.ts, brought into one file
 * because the whole point of keeping both halves is that they sit next to
 * each other: the mapper in `classes.mappers.ts` is the only thing allowed
 * to convert between them (PLAN.md §5.1).
 *
 * See frontend-react/CLASSES_FRONTEND.md Part 1 for the exact contract.
 */

// --- Wire (snake_case) -------------------------------------------------

/** Teacher's view of a class (has the join code). */
export interface ClassResponse {
	id: number;
	name: string;
	join_code: string;
	student_count: number;
	created_at: string;
}

/** Student's view of a class (no join code). */
export interface StudentClassResponse {
	id: number;
	name: string;
	teacher_name: string;
}

export interface RosterEntryResponse {
	student_id: number;
	first_name: string;
	last_name: string;
	joined_at: string;
}

export interface AssignmentResponse {
	id: number;
	class_id: number;
	title: string;
	game_type: GameType;
	config: Record<string, unknown>;
	due_at: string | null;
	target_questions: number | null;
	target_accuracy: number | null;
	created_at: string;
}

/** `AssignmentResponse` + this student's progress against it. */
export interface StudentAssignmentResponse extends AssignmentResponse {
	class_name: string;
	attempt_count: number;
	best_correct: number;
	best_accuracy: number;
}

/** One row per enrolled student; zero-attempt students still appear. */
export interface AssignmentResultRow {
	student_id: number;
	first_name: string;
	last_name: string;
	attempt_count: number;
	best_correct: number;
	most_questions: number;
	best_accuracy: number;
	/** "" until the student's first attempt. */
	last_attempt_date: string;
}

/** One attempt at an assignment, ordered oldest->newest by the API. */
export interface AttemptResponse {
	correct_questions: number;
	total_questions: number;
	accuracy: number;
	notes_per_minute: number;
	attempted_date: string;
}

export interface CreateClassRequest {
	name: string;
}

export interface JoinClassRequest {
	join_code: string;
}

export interface CreateAssignmentRequest {
	title: string;
	game_type: GameType;
	config: Record<string, unknown>;
	due_at?: string | null;
	target_questions?: number | null;
	target_accuracy?: number | null;
}

/** Every mutating endpoint here answers `{ "message": "..." }`. */
export interface MessageResponse {
	message: string;
}

// --- Domain (camelCase) ------------------------------------------------

export interface Class {
	id: number;
	name: string;
	joinCode: string;
	studentCount: number;
	createdAt: string;
}

export interface StudentClass {
	id: number;
	name: string;
	teacherName: string;
}

export interface RosterEntry {
	studentId: number;
	firstName: string;
	lastName: string;
	joinedAt: string;
}

export interface Assignment {
	id: number;
	classId: number;
	title: string;
	gameType: GameType;
	config: Record<string, unknown>;
	dueAt: string | null;
	targetQuestions: number | null;
	targetAccuracy: number | null;
	createdAt: string;
}

export interface StudentAssignment extends Assignment {
	className: string;
	attemptCount: number;
	bestCorrect: number;
	bestAccuracy: number;
}

export interface AssignmentResult {
	studentId: number;
	firstName: string;
	lastName: string;
	attemptCount: number;
	bestCorrect: number;
	mostQuestions: number;
	bestAccuracy: number;
	lastAttemptDate: string;
}

/** One attempt at an assignment, ordered oldest->newest. */
export interface Attempt {
	correctQuestions: number;
	totalQuestions: number;
	accuracy: number;
	notesPerMinute: number;
	attemptedDate: string;
}

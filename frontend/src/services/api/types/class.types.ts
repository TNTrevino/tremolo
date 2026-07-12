import type { GameType } from "./game.types";

/**
 * Classes & Assignments wire types (Go service, snake_case).
 * See frontend/CLASSES_FRONTEND.md Part 1 for the exact contract.
 */

// Teacher's view of a class (has the join code).
export interface ClassResponse {
	id: number;
	name: string;
	join_code: string;
	student_count: number;
	created_at: string;
}

// Student's view of a class (no join code).
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

// AssignmentResponse + student progress fields.
export interface StudentAssignmentResponse extends AssignmentResponse {
	class_name: string;
	attempt_count: number;
	best_correct: number;
	best_accuracy: number;
}

// One row per enrolled student; zero-attempt students still appear.
export interface AssignmentResultRow {
	student_id: number;
	first_name: string;
	last_name: string;
	attempt_count: number;
	best_correct: number;
	most_questions: number;
	best_accuracy: number;
	last_attempt_date: string; // "" until first attempt
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

// One attempt at an assignment, ordered oldest->newest by the API.
export interface AttemptResponse {
	correct_questions: number;
	total_questions: number;
	accuracy: number;
	notes_per_minute: number;
	attempted_date: string;
	attempted_time: string;
}

import type {
	Assignment,
	AssignmentResponse,
	AssignmentResult,
	AssignmentResultRow,
	Attempt,
	AttemptResponse,
	Class,
	ClassResponse,
	RosterEntry,
	RosterEntryResponse,
	StudentAssignment,
	StudentAssignmentResponse,
	StudentClass,
	StudentClassResponse,
} from "./classes.models";

/**
 * snake_case wire -> camelCase domain, and nothing else.
 *
 * In React these were private methods on `ClassesService`. They are plain
 * functions here for the reason PLAN.md §5.1 gives -- there is no React in
 * them and no `this` -- which also makes them directly unit-testable
 * without standing up the service.
 *
 * `config` is deliberately passed through untouched: it is an opaque JSONB
 * blob whose keys belong to the game that wrote it (camelCase for the
 * identification games, snake_case for the note game), so converting it
 * here would corrupt it.
 */

export function mapClassResponse(response: ClassResponse): Class {
	return {
		id: response.id,
		name: response.name,
		joinCode: response.join_code,
		studentCount: response.student_count,
		createdAt: response.created_at,
	};
}

export function mapStudentClassResponse(
	response: StudentClassResponse,
): StudentClass {
	return {
		id: response.id,
		name: response.name,
		teacherName: response.teacher_name,
	};
}

export function mapRosterEntryResponse(
	response: RosterEntryResponse,
): RosterEntry {
	return {
		studentId: response.student_id,
		firstName: response.first_name,
		lastName: response.last_name,
		joinedAt: response.joined_at,
	};
}

export function mapAssignmentResponse(
	response: AssignmentResponse,
): Assignment {
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

export function mapStudentAssignmentResponse(
	response: StudentAssignmentResponse,
): StudentAssignment {
	return {
		...mapAssignmentResponse(response),
		className: response.class_name,
		attemptCount: response.attempt_count,
		bestCorrect: response.best_correct,
		bestAccuracy: response.best_accuracy,
	};
}

export function mapAssignmentResultRow(
	row: AssignmentResultRow,
): AssignmentResult {
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

export function mapAttemptResponse(response: AttemptResponse): Attempt {
	return {
		correctQuestions: response.correct_questions,
		totalQuestions: response.total_questions,
		accuracy: response.accuracy,
		notesPerMinute: response.notes_per_minute,
		attemptedDate: response.attempted_date,
	};
}

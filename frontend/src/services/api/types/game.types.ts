/**
 * Note Game Type Definitions
 *
 * Types for the note identification game entries and results.
 * Used with the Go backend (port 5001).
 */

export interface CreateNoteGameEntryRequest {
	time_length: string; // Format: "HH:MM:SS"
	total_questions: number;
	correct_questions: number;
	user_id: number;
	notes_per_minute: number;
}

export interface NoteGameEntry {
	id: number;
	user_id: number;
	time_length: string;
	total_questions: number;
	correct_questions: number;
	notes_per_minute: number;
	created_date: string;
}

export interface CreateNoteGameEntryResponse {
	message: string;
	id: number;
}

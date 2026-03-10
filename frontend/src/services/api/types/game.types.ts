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

export interface SaveGameResultParams {
	timeLength: string; // Format: "HH:MM:SS"
	totalQuestions: number;
	correctQuestions: number;
	userId: number;
	notesPerMinute: number;
}

export interface CreateNoteGameEntryResponse {
	message: string;
	id: number;
}

export interface NoteGameSettingsResponse {
	id: number;
	user_id: number;
	game_mode: string;
	time_limit: number;
	note_limit: number;
	scale: string;
	octave: number;
}

export interface NoteGameSettingsRequest {
	game_mode: string;
	time_limit: number;
	note_limit: number;
	scale: string;
	octave: number;
}

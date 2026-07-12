/**
 * Note Game Type Definitions
 *
 * Types for the note identification game entries and results.
 * Used with the Go backend (port 5001).
 */

export type GameType =
	| "note"
	| "key_signature"
	| "scale"
	| "chord"
	| "interval";

export interface CreateNoteGameEntryRequest {
	time_length: string; // Format: "HH:MM:SS"
	total_questions: number;
	correct_questions: number;
	user_id: number;
	notes_per_minute: number;
	game_type?: GameType; // Defaults to "note" on the backend
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
	gameType?: GameType; // Defaults to "note"
}

/**
 * Generic per-game settings (key signature / scale / chord games).
 * The config shape is owned by each game's frontend.
 */
export interface GameSettingsRequest {
	game_type: Exclude<GameType, "note">;
	config: Record<string, unknown>;
}

export interface GameSettingsResponse {
	id: number;
	user_id: number;
	game_type: Exclude<GameType, "note">;
	config: Record<string, unknown>;
}

export interface CreateNoteGameEntryResponse {
	message: string;
	id: number;
}

export interface NoteGameSettingsResponse {
	low_note: string;
	high_note: string;
	clef: "treble" | "bass";
	id: number;
	user_id: number;
	game_mode: string;
	time_limit: number;
	note_limit: number;
	scale: string;
	octave: number;
}

export interface NoteGameSettingsRequest {
	low_note: string;
	high_note: string;
	clef: "treble" | "bass";
	game_mode: string;
	time_limit: number;
	note_limit: number;
	scale: string;
	octave: number;
}

/**
 * The 21-note key binding map shared by both request and response.
 */
export interface KeyBindings {
	key_c: string;
	key_c_sharp: string;
	key_c_flat: string;
	key_d: string;
	key_d_sharp: string;
	key_d_flat: string;
	key_e: string;
	key_e_sharp: string;
	key_e_flat: string;
	key_f: string;
	key_f_sharp: string;
	key_f_flat: string;
	key_g: string;
	key_g_sharp: string;
	key_g_flat: string;
	key_a: string;
	key_a_sharp: string;
	key_a_flat: string;
	key_b: string;
	key_b_sharp: string;
	key_b_flat: string;
}

export interface KeyboardBindingsResponse {
	id: number;
	user_id: number;
	key_bindings: KeyBindings;
}

export interface KeyboardBindingsRequest {
	key_bindings: KeyBindings;
}

export interface DailyActivityCount {
	date: string; // "YYYY-MM-DD"
	game_count: number;
}

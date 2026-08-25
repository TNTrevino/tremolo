/**
 * GET /api/users/{userId}/export response tree (#243) -- the data export
 * the account page downloads as a file.
 *
 * Wire-shaped (snake_case) on purpose, with NO camelCase mapper: this
 * object is never read field-by-field or rendered, it goes straight
 * into `JSON.stringify` and out to the browser as a download (see
 * account-page.component.ts's `saveExport`). Round-tripping it through a
 * mapper would be work that immediately gets undone.
 */
export interface UserExport {
	exported_at: string;
	profile: ExportProfile;
	settings: ExportSettings;
	keyboard_bindings: ExportKeyboardBindings | null;
	score_entries: ExportScoreEntry[];
	classes: ExportClasses;
	assignment_attempts: ExportAttempt[];
	friends: ExportFriend[];
}

export interface ExportProfile {
	id: number;
	first_name: string;
	last_name: string;
	email: string;
	role: string;
	instrument: string;
	school: string;
	has_google: boolean;
	created_date: string;
	created_time: string;
}

export interface ExportSettings {
	note_game: ExportNoteGameSettings | null;
	games: ExportGameSettings[];
}

export interface ExportNoteGameSettings {
	id: number;
	user_id: number;
	game_mode: string;
	time_limit: number;
	note_limit: number;
	scale: string;
	octave: number;
	low_note: string;
	high_note: string;
	clef: string;
}

/** One saved game's JSONB config -- passed straight through, never read. */
export interface ExportGameSettings {
	game_type: string;
	config: unknown;
}

export interface ExportKeyBindings {
	key_c: string;
	key_d: string;
	key_e: string;
	key_f: string;
	key_g: string;
	key_a: string;
	key_b: string;
	key_c_sharp: string;
	key_d_sharp: string;
	key_e_sharp: string;
	key_f_sharp: string;
	key_g_sharp: string;
	key_a_sharp: string;
	key_b_sharp: string;
	key_c_flat: string;
	key_d_flat: string;
	key_e_flat: string;
	key_f_flat: string;
	key_g_flat: string;
	key_a_flat: string;
	key_b_flat: string;
}

export interface ExportKeyboardBindings {
	id: number;
	user_id: number;
	key_bindings: ExportKeyBindings;
}

export interface ExportScoreEntry {
	id: number;
	game_type: string;
	total_questions: number;
	correct_questions: number;
	notes_per_minute: number;
	time_length: string;
	assignment_id: number | null;
	created_date: string;
	created_time: string;
}

export interface ExportClasses {
	joined: ExportJoinedClass[];
	owned: ExportOwnedClass[];
}

/** A class joined as a student. No join code -- a student shouldn't redistribute their teacher's. */
export interface ExportJoinedClass {
	id: number;
	name: string;
	teacher_name: string;
}

/** A class owned as a teacher. */
export interface ExportOwnedClass {
	id: number;
	name: string;
	join_code: string;
	student_count: number;
	created_at: string;
}

/** One score entry tagged with a class assignment. */
export interface ExportAttempt {
	entry_id: number;
	assignment_id: number;
	assignment_title: string;
	game_type: string;
	class_name: string;
	correct_questions: number;
	total_questions: number;
	notes_per_minute: number;
	time_length: string;
	created_date: string;
	created_time: string;
}

export interface ExportFriend {
	id: number;
	first_name: string;
	last_name: string;
	role: string;
	instrument: string;
	school: string;
}

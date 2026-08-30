/**
 * Score entries, per-game settings and keyboard bindings.
 *
 * Port of frontend-react/src/services/api/types/game.types.ts, split into
 * the wire shape (`*Dto`, snake_case, exactly what
 * `core-api/DTOs/` serialises) and the domain shape (camelCase, what
 * the app reads). `UserService` is the only place the two meet -- see
 * phase-3.md's uniform rule.
 *
 * Two things deliberately keep their wire spelling:
 *
 * - **`GameType`'s values.** `"key_signature"` is an identifier the Go
 *   service validates (`dtos.ValidGameTypes`) and that rides in a query
 *   string; it is data, not a property name. The root CLAUDE.md pins this
 *   union to that table.
 * - **`KeyBindings`' keys.** It is a dictionary keyed by note name
 *   (`key_c_sharp` -> `"w"`), not a record with fields, and the note game
 *   looks entries up by name. Renaming the keys to `keyCSharp` would buy
 *   nothing and cost a 21-entry translation table in both directions.
 */
export type GameType =
	"note" | "key_signature" | "scale" | "chord" | "interval";

/** Every game except the note game persists its settings as JSONB. */
export type SettingsGameType = Exclude<GameType, "note">;

// --- Score entries -------------------------------------------------------

/** Body of `POST /api/note-game/entry`. */
export interface CreateGameEntryDto {
	/** `"HH:MM:SS"`. */
	time_length: string;
	total_questions: number;
	correct_questions: number;
	user_id: number;
	notes_per_minute: number;
	/** Omitted means `"note"` on the backend; sent explicitly anyway. */
	game_type?: GameType;
	/** Present only when the play was tagged as an assignment attempt. */
	assignment_id?: number;
}

export interface SaveGameResultParams {
	/** `"HH:MM:SS"`. */
	timeLength: string;
	totalQuestions: number;
	correctQuestions: number;
	userId: number;
	notesPerMinute: number;
	/** Defaults to `"note"`. */
	gameType?: GameType;
	assignmentId?: number;
}

/**
 * The `assignment_id` key is left off entirely when there is no assignment,
 * rather than sent as `null`: `user.service.test.ts` pinned that
 * (`expect(body.assignment_id).toBeUndefined()`) and the Go binder treats a
 * missing key and a null the same only by accident.
 */
export const toCreateGameEntryDto = (
	params: SaveGameResultParams,
): CreateGameEntryDto => ({
	time_length: params.timeLength,
	total_questions: params.totalQuestions,
	correct_questions: params.correctQuestions,
	user_id: params.userId,
	notes_per_minute: params.notesPerMinute,
	game_type: params.gameType ?? "note",
	assignment_id: params.assignmentId,
});

/** No `Dto` suffix and no mapper: both keys are already domain-shaped. */
export interface CreateGameEntryResponse {
	message: string;
	id: number;
}

/** `GET /api/note-game/recent` -- newest first, up to 30. */
export interface GameEntryDto {
	id: number;
	user_id: number;
	time_length: string;
	total_questions: number;
	correct_questions: number;
	notes_per_minute: number;
	created_date: string;
}

export interface GameEntry {
	id: number;
	userId: number;
	/** `"HH:MM:SS"`. */
	timeLength: string;
	totalQuestions: number;
	correctQuestions: number;
	notesPerMinute: number;
	createdDate: string;
}

export const mapGameEntry = (dto: GameEntryDto): GameEntry => ({
	id: dto.id,
	userId: dto.user_id,
	timeLength: dto.time_length,
	totalQuestions: dto.total_questions,
	correctQuestions: dto.correct_questions,
	notesPerMinute: dto.notes_per_minute,
	createdDate: dto.created_date,
});

/** `GET /api/note-game/activity` -- one row per day, for the heatmap. */
export interface DailyActivityDto {
	/** `"YYYY-MM-DD"`. */
	date: string;
	game_count: number;
}

export interface DailyActivity {
	/** `"YYYY-MM-DD"`. */
	date: string;
	gameCount: number;
}

export const mapDailyActivity = (dto: DailyActivityDto): DailyActivity => ({
	date: dto.date,
	gameCount: dto.game_count,
});

// --- Note-game settings (typed table, not JSONB) -------------------------

export type Clef = "treble" | "bass";

export interface NoteGameSettingsDto {
	id: number;
	user_id: number;
	game_mode: string;
	time_limit: number;
	note_limit: number;
	scale: string;
	octave: number;
	low_note: string;
	high_note: string;
	clef: Clef;
}

export interface NoteGameSettings {
	id: number;
	userId: number;
	gameMode: string;
	timeLimit: number;
	noteLimit: number;
	scale: string;
	octave: number;
	lowNote: string;
	highNote: string;
	clef: Clef;
}

/** What `PUT /api/note-game/settings` accepts: the row without its identity. */
export type NoteGameSettingsInput = Omit<NoteGameSettings, "id" | "userId">;

export const mapNoteGameSettings = (
	dto: NoteGameSettingsDto,
): NoteGameSettings => ({
	id: dto.id,
	userId: dto.user_id,
	gameMode: dto.game_mode,
	timeLimit: dto.time_limit,
	noteLimit: dto.note_limit,
	scale: dto.scale,
	octave: dto.octave,
	lowNote: dto.low_note,
	highNote: dto.high_note,
	clef: dto.clef,
});

export const toNoteGameSettingsDto = (
	settings: NoteGameSettingsInput,
): Omit<NoteGameSettingsDto, "id" | "user_id"> => ({
	game_mode: settings.gameMode,
	time_limit: settings.timeLimit,
	note_limit: settings.noteLimit,
	scale: settings.scale,
	octave: settings.octave,
	low_note: settings.lowNote,
	high_note: settings.highNote,
	clef: settings.clef,
});

// --- Generic game settings (JSONB `config`) ------------------------------

export interface GameSettingsDto {
	id: number;
	user_id: number;
	game_type: SettingsGameType;
	config: Record<string, unknown>;
}

export interface GameSettingsInput {
	gameType: SettingsGameType;
	/**
	 * Owned by each game's frontend and stored verbatim as JSONB. The Go
	 * side only checks "JSON object <= 4KB"; `sanitizeConfig` on the
	 * frontend is what validates the contents on the way back in, so the
	 * keys inside must never be rewritten here.
	 */
	config: Record<string, unknown>;
}

export interface GameSettings extends GameSettingsInput {
	id: number;
	userId: number;
}

export const mapGameSettings = (dto: GameSettingsDto): GameSettings => ({
	id: dto.id,
	userId: dto.user_id,
	gameType: dto.game_type,
	config: dto.config,
});

export const toGameSettingsDto = (
	settings: GameSettingsInput,
): Omit<GameSettingsDto, "id" | "user_id"> => ({
	game_type: settings.gameType,
	config: settings.config,
});

// --- Keyboard bindings ---------------------------------------------------

/** The 21-note binding map. Keys are note names; see the file header. */
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

export interface KeyboardBindingsDto {
	id: number;
	user_id: number;
	key_bindings: KeyBindings;
	/**
	 * Optional here and required on the domain side: a row the Go service
	 * wrote before the column existed omits it, and `mapKeyboardBindings` is
	 * where a missing flag becomes a real `false`.
	 *
	 * It sits **beside** `key_bindings` rather than inside it, on both the
	 * wire and the row -- `dtos.KeyboardBindingsResponse` in the Go service.
	 * The 21 note fields are a dictionary the service validates as a set (no
	 * two notes may share a key); a layout switch is not one of them.
	 */
	overlap_accidentals?: boolean;
}

export interface KeyboardBindings {
	id: number;
	userId: number;
	keyBindings: KeyBindings;
	/**
	 * Piano-shaped input: the naturals keep their bindings, the five sharps
	 * move to fixed black-key slots (`w e t y u`), and the other nine notes
	 * lose their key and are played enharmonically instead. Off by default,
	 * and off changes nothing anywhere.
	 *
	 * camelCase, unlike the keys of `keyBindings`: the exception in the file
	 * header covers a dictionary keyed by note name, and this is an ordinary
	 * property, so the usual "snake_case stops at the mapper" rule applies.
	 */
	overlapAccidentals: boolean;
}

export const mapKeyboardBindings = (
	dto: KeyboardBindingsDto,
): KeyboardBindings => ({
	id: dto.id,
	userId: dto.user_id,
	keyBindings: dto.key_bindings,
	// The one field the mapper decides rather than copies: a missing flag is
	// the standard layout, not an undefined one, so nothing above this line
	// reads anything but a plain boolean.
	overlapAccidentals: dto.overlap_accidentals ?? false,
});

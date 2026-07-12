/**
 * API Types Barrel Export
 *
 * Re-exports all API types for convenient importing.
 */

export type {
	UserRole,
	ApiUser,
	User,
	LoginRequest,
	LoginResponse,
	RegisterRequest,
	RegisterResponse,
	RefreshTokenRequest,
	RefreshTokenResponse,
	PasswordRequirement,
	GoogleCallbackRequest,
} from "./auth.types";

export type {
	GameType,
	CreateNoteGameEntryRequest,
	GameSettingsRequest,
	GameSettingsResponse,
	SaveGameResultParams,
	NoteGameEntry,
	CreateNoteGameEntryResponse,
	NoteGameSettingsResponse,
	NoteGameSettingsRequest,
	KeyBindings,
	KeyboardBindingsResponse,
	KeyboardBindingsRequest,
	DailyActivityCount,
} from "./game.types";

export type { GeneralUserInfo, UserProfile } from "./user.types";

export type {
	ChartDataPoint,
	MultiMetricChartData,
	ChartInterval,
	ChartQueryParams,
} from "./chart.types";

export type {
	MaryRequest,
	RandomNotesRequest,
	NoteGameRequest,
	NoteGameResponse,
	StaffClef,
	RangeClef,
	KeySignatureGameRequest,
	KeySignatureGameResponse,
	ScaleType,
	ScaleGameRequest,
	ScaleGameResponse,
	ChordQuality,
	ChordGameRequest,
	ChordGameResponse,
	ScaleQuestionMode,
	IntervalDisplayMode,
	IntervalGameRequest,
	IntervalGameResponse,
} from "./music.types";

export type { ApiError, ApiResponse } from "./error.types";

export type { FriendResponse } from "./friend.types";

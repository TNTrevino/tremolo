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
} from "./auth.types";

export type {
	CreateNoteGameEntryRequest,
	SaveGameResultParams,
	NoteGameEntry,
	CreateNoteGameEntryResponse,
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
} from "./music.types";

export type { ApiError, ApiResponse } from "./error.types";

export type { FriendResponse } from "./friend.types";

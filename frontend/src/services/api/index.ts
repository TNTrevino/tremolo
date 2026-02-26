/**
 * API Services Index
 *
 * Central export point for all API services and utilities.
 * Import from this file to access any API service functionality.
 *
 * @example
 * ```typescript
 * // Import individual services
 * import { authService, musicService, userService } from '@/services/api';
 *
 * // Import specific functions
 * import { login, generateMary, getProfile } from '@/services/api';
 *
 * // Import types
 * import type { User, NoteGameEntry } from '@/services/api';
 * ```
 */

export {
	musicApiClient,
	mainApiClient,
	getAccessToken,
	getRefreshToken,
	setTokens,
	clearTokens,
	TOKEN_STORAGE_KEY,
	REFRESH_TOKEN_STORAGE_KEY,
} from "./clients";

export {
	authService,
	login,
	register,
	logout,
	refreshToken,
	getCurrentUser,
	isAuthenticated,
} from "./auth.service";

export {
	musicService,
	generateMary,
	generateRandom,
	generateNoteGame,
	isValidNote,
	isValidRhythm,
} from "./music.service";

export {
	userService,
	getProfile,
	updateProfile,
	getStats,
	saveGameResult,
	getRecentGameEntries,
	getClassMetrics,
	formatTimeLength,
	calculateNPM,
} from "./user.service";

export { friendsService, getFriends } from "./friends.service";

export type {
	UserRole,
	User,
	LoginRequest,
	LoginResponse,
	RegisterRequest,
	RegisterResponse,
	RefreshTokenRequest,
	RefreshTokenResponse,
	CreateNoteGameEntryRequest,
	NoteGameEntry,
	CreateNoteGameEntryResponse,
	GeneralUserInfo,
	ChartDataPoint,
	MultiMetricChartData,
	ChartInterval,
	ChartQueryParams,
	MaryRequest,
	RandomNotesRequest,
	NoteGameRequest,
	NoteGameResponse,
	ApiError,
	ApiResponse,
	FriendResponse,
} from "./types";

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

// ============================================================================
// API Clients
// ============================================================================

export {
	musicApiClient,
	mainApiClient,
	getAccessToken,
	getRefreshToken,
	setTokens,
	clearTokens,
	TOKEN_STORAGE_KEY,
	REFRESH_TOKEN_STORAGE_KEY,
} from "./client";

// ============================================================================
// Services
// ============================================================================

// Auth Service
export {
	authService,
	login,
	register,
	logout,
	refreshToken,
	getCurrentUser,
	isAuthenticated,
} from "./auth.service";

// Music Service
export {
	musicService,
	generateMary,
	generateRandom,
	generateNoteGame,
	isValidNote,
	isValidRhythm,
} from "./music.service";

// User Service
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

// ============================================================================
// Types
// ============================================================================

export type {
	// Auth & User Types
	UserRole,
	User,
	LoginRequest,
	LoginResponse,
	RegisterRequest,
	RegisterResponse,
	RefreshTokenRequest,
	RefreshTokenResponse,

	// Note Game Types
	CreateNoteGameEntryRequest,
	NoteGameEntry,
	CreateNoteGameEntryResponse,

	// User Info Types
	GeneralUserInfo,

	// Chart/Analytics Types
	ChartDataPoint,
	MultiMetricChartData,
	ChartInterval,
	ChartQueryParams,

	// Music Generation Types
	MaryRequest,
	RandomNotesRequest,
	NoteGameRequest,
	NoteGameResponse,

	// Error Types
	ApiError,
	ApiResponse,
} from "./types";

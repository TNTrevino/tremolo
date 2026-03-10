import {
	mainApiClient,
	musicApiClient,
	getAccessToken,
	getRefreshToken,
	setTokens,
	clearTokens,
} from "./clients";
import { AuthService } from "./auth.service";
import { UserService } from "./user.service";
import { MusicService } from "./music.service";
import { FriendsService } from "./friends.service";

export const authService = new AuthService(mainApiClient, {
	setTokens,
	clearTokens,
	getRefreshToken,
	getAccessToken,
});

export const userService = new UserService(mainApiClient);
export const musicService = new MusicService(musicApiClient);
export const friendsService = new FriendsService(mainApiClient);

export { AuthService } from "./auth.service";
export { UserService } from "./user.service";
export { MusicService } from "./music.service";
export { FriendsService } from "./friends.service";

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
	CreateNoteGameEntryRequest,
	NoteGameEntry,
	CreateNoteGameEntryResponse,
	NoteGameSettingsResponse,
	NoteGameSettingsRequest,
	GeneralUserInfo,
	UserProfile,
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

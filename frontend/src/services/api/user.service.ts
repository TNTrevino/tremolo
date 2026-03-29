import { AxiosError, type AxiosInstance } from "axios";
import type {
	GeneralUserInfo,
	SaveGameResultParams,
	CreateNoteGameEntryRequest,
	CreateNoteGameEntryResponse,
	NoteGameEntry,
	NoteGameSettingsResponse,
	NoteGameSettingsRequest,
	KeyboardBindingsResponse,
	KeyboardBindingsRequest,
	MultiMetricChartData,
	ChartQueryParams,
} from "./types";

export class UserService {
	constructor(private client: AxiosInstance) {}

	async getProfile(userId: number): Promise<GeneralUserInfo> {
		const response = await this.client.get<GeneralUserInfo>(
			`/api/users/${userId}/general-info`,
		);
		return response.data;
	}

	async updateProfile(
		userId: number,
		updates: Partial<GeneralUserInfo>,
	): Promise<GeneralUserInfo> {
		const response = await this.client.patch<GeneralUserInfo>(
			`/api/users/${userId}`,
			updates,
		);
		return response.data;
	}

	async getStats(
		userId: number,
		params?: ChartQueryParams,
	): Promise<MultiMetricChartData> {
		const queryParams = new URLSearchParams();

		if (params?.interval) {
			queryParams.append("interval", params.interval);
		}

		if (params?.days) {
			queryParams.append("days", params.days.toString());
		}

		const queryString = queryParams.toString();
		const url = `/api/charts/user/${userId}/metrics${queryString ? `?${queryString}` : ""}`;

		const response = await this.client.get<MultiMetricChartData>(url);
		return response.data;
	}

	async saveGameResult(
		params: SaveGameResultParams,
	): Promise<CreateNoteGameEntryResponse> {
		const request: CreateNoteGameEntryRequest = {
			time_length: params.timeLength,
			total_questions: params.totalQuestions,
			correct_questions: params.correctQuestions,
			user_id: params.userId,
			notes_per_minute: params.notesPerMinute,
		};
		const response = await this.client.post<CreateNoteGameEntryResponse>(
			"/api/note-game/entry",
			request,
		);
		return response.data;
	}

	async getRecentGameEntries(): Promise<NoteGameEntry[]> {
		const response = await this.client.get<NoteGameEntry[]>(
			"/api/note-game/recent",
		);
		return response.data;
	}

	async getClassMetrics(
		params?: ChartQueryParams,
	): Promise<MultiMetricChartData> {
		const queryParams = new URLSearchParams();

		if (params?.interval) {
			queryParams.append("interval", params.interval);
		}

		if (params?.days) {
			queryParams.append("days", params.days.toString());
		}

		const queryString = queryParams.toString();
		const url = `/api/charts/teacher/class-metrics${queryString ? `?${queryString}` : ""}`;

		const response = await this.client.get<MultiMetricChartData>(url);
		return response.data;
	}

	async changePassword(
		userId: number,
		data: { currentPassword: string; newPassword: string },
	): Promise<{ message: string }> {
		const response = await this.client.post(
			`/api/users/${userId}/change-password`,
			data,
		);
		return response.data;
	}

	async deleteAccount(userId: number): Promise<{ message: string }> {
		const response = await this.client.delete(`/api/users/${userId}`);
		return response.data;
	}

	async downloadUserData(userId: number): Promise<Blob> {
		const response = await this.client.get(`/api/users/${userId}/data-export`, {
			responseType: "blob",
		});
		return response.data;
	}

	async getNoteGameSettings(): Promise<NoteGameSettingsResponse | null> {
		try {
			const response = await this.client.get<NoteGameSettingsResponse>(
				"/api/note-game/settings",
			);
			const data = response.data as unknown as Record<string, unknown>;
			if ("settings" in data && data.settings === null) {
				return null;
			}
			return response.data;
		} catch (error) {
			if (error instanceof AxiosError && error.response?.status === 404) {
				return null;
			}
			throw error;
		}
	}

	async saveNoteGameSettings(
		settings: NoteGameSettingsRequest,
	): Promise<NoteGameSettingsResponse> {
		const response = await this.client.put<NoteGameSettingsResponse>(
			"/api/note-game/settings",
			settings,
		);
		return response.data;
	}

	async getKeyboardBindings(): Promise<KeyboardBindingsResponse | null> {
		try {
			const response = await this.client.get<KeyboardBindingsResponse>(
				"/api/note-game/keyboard-bindings",
			);
			return response.data;
		} catch (error) {
			if (error instanceof AxiosError && error.response?.status === 404) {
				return null;
			}
			throw error;
		}
	}

	async saveKeyboardBindings(
		bindings: KeyboardBindingsRequest,
	): Promise<KeyboardBindingsResponse> {
		const response = await this.client.put<KeyboardBindingsResponse>(
			"/api/note-game/keyboard-bindings",
			bindings,
		);
		return response.data;
	}
}

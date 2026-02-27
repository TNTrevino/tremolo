import type { AxiosInstance } from "axios";
import type {
	GeneralUserInfo,
	CreateNoteGameEntryRequest,
	CreateNoteGameEntryResponse,
	NoteGameEntry,
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
		entry: CreateNoteGameEntryRequest,
	): Promise<CreateNoteGameEntryResponse> {
		const response = await this.client.post<CreateNoteGameEntryResponse>(
			"/api/note-game/entry",
			entry,
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

	formatTimeLength(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = seconds % 60;

		return [hours, minutes, secs]
			.map((val) => String(val).padStart(2, "0"))
			.join(":");
	}

	calculateNPM(correctQuestions: number, timeInSeconds: number): number {
		if (timeInSeconds === 0) return 0;

		const minutes = timeInSeconds / 60;
		const npm = correctQuestions / minutes;

		return Math.round(npm);
	}
}

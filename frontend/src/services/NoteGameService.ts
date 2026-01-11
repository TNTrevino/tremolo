import { apiClient, isOk } from "./axiosInstance";

export interface NoteGameEntryRequest {
	user_id: number;
	time_length: string;
	total_questions: number;
	correct_questions: number;
	notes_per_minute: number;
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

interface NoteGameEntryResponse {
	message: string;
	id: number;
}

interface NoteGameError {
	error: string;
}

export const NoteGameService = {
	async saveNoteGameEntry(
		entry: NoteGameEntryRequest,
	): Promise<NoteGameEntryResponse> {
		const response = await apiClient.post<
			NoteGameEntryResponse | NoteGameError
		>("/api/note-game/entry", entry);

		if (!isOk(response)) {
			const errorData = response.data as NoteGameError;
			throw new Error(
				errorData.error || "Failed to save note game entry. Please try again.",
			);
		}

		return response.data as NoteGameEntryResponse;
	},

	async getRecentEntries(): Promise<NoteGameEntry[]> {
		const response = await apiClient.get<NoteGameEntry[] | NoteGameError>(
			"/api/note-game/recent",
		);

		if (!isOk(response)) {
			const errorData = response.data as NoteGameError;
			throw new Error(
				errorData.error || "Failed to fetch recent entries. Please try again.",
			);
		}

		return response.data as NoteGameEntry[];
	},
};

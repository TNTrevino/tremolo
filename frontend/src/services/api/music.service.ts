import type { AxiosInstance } from "axios";
import type {
	MaryRequest,
	RandomNotesRequest,
	NoteGameRequest,
	NoteGameResponse,
} from "./types";

export class MusicService {
	private noteRegex = /^[A-G](#|b)?$/;

	constructor(private client: AxiosInstance) {}

	async generateMary(params: MaryRequest): Promise<string> {
		const response = await this.client.post<string>("/mary", params);
		return response.data;
	}

	async generateRandom(params: RandomNotesRequest): Promise<string> {
		const response = await this.client.post<string>("/random", params);
		return response.data;
	}

	async generateNoteGame(params: NoteGameRequest): Promise<NoteGameResponse> {
		const response = await this.client.post<NoteGameResponse>(
			"/note-game",
			params,
		);
		return response.data;
	}

	isValidNote(noteName: string): boolean {
		return this.noteRegex.test(noteName);
	}

	isValidRhythm(rhythm: string, rhythmType: number): boolean {
		if (!/^[012]+$/.test(rhythm)) {
			return false;
		}

		if (rhythmType === 8 && rhythm.length > 2) {
			return false;
		}
		if (rhythmType === 16 && rhythm.length > 4) {
			return false;
		}

		return true;
	}
}

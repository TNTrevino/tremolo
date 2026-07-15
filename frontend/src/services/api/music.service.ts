import type { AxiosInstance } from "axios";
import type {
	MaryRequest,
	RandomNotesRequest,
	NoteGameRequest,
	NoteGameResponse,
	KeySignatureGameRequest,
	KeySignatureGameResponse,
	ScaleGameRequest,
	ScaleGameResponse,
	ChordGameRequest,
	ChordGameResponse,
	IntervalGameRequest,
	IntervalGameResponse,
} from "./types";
import { fromMusic21NoteName, toMusic21NoteName } from "./mappers/music.mapper";

/**
 * Client for the music-generation microservice. Note-name notation is
 * converted at this boundary: callers send and receive UI notation
 * ("Bb"); the wire format is music21 notation ("B-").
 */
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
		const response = await this.client.post<NoteGameResponse>("/note-game", {
			...params,
			scale: toMusic21NoteName(params.scale),
		});
		return {
			...response.data,
			noteName: fromMusic21NoteName(response.data.noteName),
		};
	}

	async generateKeySignatureGame(
		params: KeySignatureGameRequest,
	): Promise<KeySignatureGameResponse> {
		const response = await this.client.post<KeySignatureGameResponse>(
			"/key-signature-game",
			params,
		);
		return {
			...response.data,
			tonic: fromMusic21NoteName(response.data.tonic),
			minorTonic: fromMusic21NoteName(response.data.minorTonic),
		};
	}

	async generateScaleGame(
		params: ScaleGameRequest,
	): Promise<ScaleGameResponse> {
		const response = await this.client.post<ScaleGameResponse>("/scale-game", {
			...params,
			...(params.tonicPool
				? { tonicPool: params.tonicPool.map(toMusic21NoteName) }
				: {}),
		});
		return {
			...response.data,
			tonic: fromMusic21NoteName(response.data.tonic),
		};
	}

	async generateChordGame(
		params: ChordGameRequest,
	): Promise<ChordGameResponse> {
		const response = await this.client.post<ChordGameResponse>("/chord-game", {
			...params,
			...(params.rootPool
				? { rootPool: params.rootPool.map(toMusic21NoteName) }
				: {}),
		});
		return {
			...response.data,
			root: fromMusic21NoteName(response.data.root),
		};
	}

	async generateIntervalGame(
		params: IntervalGameRequest,
	): Promise<IntervalGameResponse> {
		const response = await this.client.post<IntervalGameResponse>(
			"/interval-game",
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

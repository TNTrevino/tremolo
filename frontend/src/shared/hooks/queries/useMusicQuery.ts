import { useMutation } from "@tanstack/react-query";
import { musicService } from "@/services/api";
import type {
	MaryRequest,
	RandomNotesRequest,
	NoteGameRequest,
	NoteGameResponse,
} from "@/services/api/types";

/**
 * Mutation to generate "Mary Had a Little Lamb" in different keys/octaves.
 * Returns raw MusicXML string.
 */
export function useGenerateMary() {
	return useMutation({
		mutationFn: (request: MaryRequest) => musicService.generateMary(request),
	});
}

/**
 * Mutation to generate random notes with a specified rhythm pattern.
 * Returns raw MusicXML string.
 */
export function useGenerateRandom() {
	return useMutation({
		mutationFn: (request: RandomNotesRequest) =>
			musicService.generateRandom(request),
	});
}

/**
 * Mutation to generate a single note for the note identification game.
 * Returns MusicXML + note metadata (name, octave).
 */
export function useGenerateNoteGame() {
	return useMutation({
		mutationFn: (request: NoteGameRequest): Promise<NoteGameResponse> =>
			musicService.generateNoteGame(request),
	});
}

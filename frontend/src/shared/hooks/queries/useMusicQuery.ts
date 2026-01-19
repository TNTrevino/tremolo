import { useMutation } from "@tanstack/react-query";

// Types based on existing MusicService
interface GenerateMaryRequest {
	scale: string;
	octave: string;
}

interface GenerateRhythmRequest {
	scale: string;
	octave: string;
	rhythmType: string;
	rhythm: string;
}

interface NoteGameRequest {
	scale: string;
	octave: string;
}

interface NoteGameResponse {
	generatedXml: string;
	noteName: string;
	noteOctave: string;
	fullNoteName: string;
}

interface MusicXmlResponse {
	xml: string;
}

// Query Keys
export const musicKeys = {
	all: ["music"] as const,
	mary: () => [...musicKeys.all, "mary"] as const,
	rhythm: () => [...musicKeys.all, "rhythm"] as const,
	noteGame: () => [...musicKeys.all, "note-game"] as const,
};

/**
 * Hook to generate "Mary Had a Little Lamb" music in different keys
 * Returns MusicXML that can be rendered with OpenSheetMusicDisplay
 */
export function useGenerateMary(onSuccess?: (xml: string) => void) {
	return useMutation({
		mutationFn: async (
			_request: GenerateMaryRequest,
		): Promise<MusicXmlResponse> => {
			// TODO: Replace with actual API call
			// const response = await musicApi.generateMary(_request);
			// return response.data;

			// Placeholder for now
			throw new Error("API service not yet implemented");
		},
		onSuccess: (data) => {
			if (onSuccess) {
				onSuccess(data.xml);
			}
		},
	});
}

/**
 * Hook to generate random notes with specified rhythm patterns
 * Returns MusicXML that can be rendered with OpenSheetMusicDisplay
 */
export function useGenerateRhythm(onSuccess?: (xml: string) => void) {
	return useMutation({
		mutationFn: async (
			_request: GenerateRhythmRequest,
		): Promise<MusicXmlResponse> => {
			// TODO: Replace with actual API call
			// const response = await musicApi.generateRhythm(_request);
			// return response.data;

			// Placeholder for now
			throw new Error("API service not yet implemented");
		},
		onSuccess: (data) => {
			if (onSuccess) {
				onSuccess(data.xml);
			}
		},
	});
}

/**
 * Hook to generate a note for the note identification game
 * Returns MusicXML and note information
 */
export function useGenerateNoteGame(
	onSuccess?: (noteInfo: NoteGameResponse) => void,
) {
	return useMutation({
		mutationFn: async (
			_request: NoteGameRequest,
		): Promise<NoteGameResponse> => {
			// TODO: Replace with actual API call
			// const response = await musicApi.generateNoteGame(_request);
			// return response.data;

			// Placeholder for now
			throw new Error("API service not yet implemented");
		},
		onSuccess: (data) => {
			if (onSuccess) {
				onSuccess(data);
			}
		},
	});
}

/**
 * Helper hook for rendering MusicXML to the DOM
 * This is a utility that can be used with any of the above hooks
 */
export function useRenderSheetMusic() {
	const renderXml = async (
		_xml: string,
		containerId: string = "sheet-music-div",
	) => {
		const container = document.getElementById(containerId);
		if (!container) {
			throw new Error(`Could not find container with id: ${containerId}`);
		}

		// TODO: Import and use OpenSheetMusicDisplay
		// const osmd = new OpenSheetMusicDisplay(container);
		// await osmd.load(_xml);
		// osmd.render();

		throw new Error("OpenSheetMusicDisplay not yet integrated");
	};

	return { renderXml };
}

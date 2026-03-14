/**
 * Music Generation Type Definitions
 *
 * Types for music generation requests and responses.
 * Used with the FastAPI backend (port 8000).
 */

export interface MaryRequest {
	tonic: string; // Root note (C, D, E, F, G, A, B, optionally with # or -)
	octave: number; // Octave number (e.g., 4)
}

export interface RandomNotesRequest {
	rhythm: string; // Rhythm pattern as digit string (e.g., "1111", "112")
	rhythmType: number; // Note duration type (8 for eighth, 16 for sixteenth)
	tonic: string; // Root note for scale
}

export interface NoteGameRequest {
	scale: string; // Scale root note (e.g., "C", "D#")
	octave: string; // Octave as string (e.g., "4")
}

export interface NoteGameResponse {
	generatedXml: string; // MusicXML content
	noteName: string; // Generated note name (e.g., "C", "D#")
	noteOctave: string; // Generated note octave
}

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

export type StaffClef =
	| "treble"
	| "bass"
	| "alto"
	| "tenor"
	| "soprano"
	| "mezzo_soprano"
	| "baritone";

/** Clefs the note game's staff range picker supports */
export type RangeClef = Extract<StaffClef, "treble" | "bass">;

export interface NoteGameRequest {
	scale: string; // Scale root note (e.g., "C", "D#")
	octave: string; // Octave as string (e.g., "4")
	lowNote?: string; // Range mode: lowest allowed note (e.g., "F3")
	highNote?: string; // Range mode: highest allowed note (e.g., "C6")
	clef?: RangeClef;
}

export interface NoteGameResponse {
	generatedXml: string; // MusicXML content
	noteName: string; // Generated note name (e.g., "C", "D#")
	noteOctave: string; // Generated note octave
}

export interface KeySignatureGameRequest {
	clefs?: StaffClef[];
	keySignatures?: number[]; // Fifths counts, -7..7 (negative = flats)
}

export interface KeySignatureGameResponse {
	generatedXml: string;
	tonic: string; // Major key tonic, music21 notation (e.g., "E-")
	minorTonic: string; // Relative minor tonic, music21 notation
	sharps: number; // Positive = sharps, negative = flats
	clef: StaffClef;
}

export type ScaleType =
	| "major"
	| "natural_minor"
	| "harmonic_minor"
	| "melodic_minor";

export type ScaleQuestionMode = "accidentals" | "key_signature";

export interface ScaleGameRequest {
	clefs?: StaffClef[];
	tonicPool?: string[]; // music21 notation (e.g., "B-")
	scaleTypes?: ScaleType[];
	octave?: number;
	questionMode?: ScaleQuestionMode;
}

export interface ScaleGameResponse {
	generatedXml: string;
	tonic: string;
	scaleType: ScaleType;
	clef: StaffClef;
}

export type ChordQuality =
	| "major"
	| "minor"
	| "augmented"
	| "diminished"
	| "dominant7"
	| "major7"
	| "minor7"
	| "half_diminished7"
	| "diminished7"
	| "dominant9"
	| "major9"
	| "minor9";

export interface ChordGameRequest {
	clefs?: StaffClef[];
	rootPool?: string[]; // music21 notation (e.g., "E-")
	qualities?: ChordQuality[];
	octave?: number;
	inversions?: boolean;
}

export interface ChordGameResponse {
	generatedXml: string;
	root: string;
	quality: ChordQuality;
	inversion: number; // 0 = root position
	clef: StaffClef;
}

export type IntervalDisplayMode = "harmonic" | "melodic";

export interface IntervalGameRequest {
	clefs?: StaffClef[];
	octave?: number;
	displayMode?: IntervalDisplayMode;
	intervals?: string[]; // music21 interval names (e.g., "m3", "P5")
}

export interface IntervalGameResponse {
	generatedXml: string;
	interval: string; // Full name, e.g. "M3"
	number: number; // Generic size, e.g. 3
	quality: string; // e.g. "M"
	clef: StaffClef;
}

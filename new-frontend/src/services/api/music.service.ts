/**
 * Music Generation Service
 * 
 * Handles all music generation operations using the Django backend (port 8000).
 * Generates MusicXML content for various music education exercises.
 * 
 * All endpoints return MusicXML format that can be rendered with OpenSheetMusicDisplay.
 */

import { musicApiClient } from './client';
import type {
  MaryRequest,
  RandomNotesRequest,
  NoteGameRequest,
  NoteGameResponse,
} from './types';

/**
 * Generate "Mary Had a Little Lamb" in a specified key and octave
 * 
 * Returns MusicXML content for the melody transposed to the requested key.
 * Useful for practicing sight reading in different keys.
 * 
 * @param params - Generation parameters
 * @param params.tonic - Root note (C, D, E, F, G, A, B, optionally with # or -)
 * @param params.octave - Octave number (typically 3-5)
 * @returns Promise with MusicXML string
 * @throws ApiError if invalid note or generation fails
 * 
 * @example
 * ```typescript
 * // Generate "Mary Had a Little Lamb" in D major, octave 4
 * const musicXml = await musicService.generateMary({
 *   tonic: 'D',
 *   octave: 4
 * });
 * // Render musicXml with OpenSheetMusicDisplay
 * ```
 */
export const generateMary = async (params: MaryRequest): Promise<string> => {
  const response = await musicApiClient.post<string>('/mary', params);
  return response.data;
};

/**
 * Generate random notes with specified rhythm pattern
 * 
 * Creates a measure of music with randomly selected notes from the specified
 * scale, arranged according to the rhythm pattern. Useful for sight reading practice.
 * 
 * @param params - Generation parameters
 * @param params.rhythm - Rhythm pattern as digit string
 *   - For type 16: "1111", "112", "121", "211", "0111"
 *     (0=rest 0.25 beats, 1=note 0.25 beats, 2=note 0.5 beats)
 *   - For type 8: "11", "01", "10"
 *     (0=rest 0.5 beats, 1=note 0.5 beats)
 * @param params.rhythmType - Note duration type (8 for eighth notes, 16 for sixteenth notes)
 * @param params.tonic - Root note for scale (C, D, E, F, G, A, B, optionally with # or -)
 * @returns Promise with MusicXML string
 * @throws ApiError if invalid parameters or generation fails
 * 
 * @example
 * ```typescript
 * // Generate four random sixteenth notes in C major
 * const musicXml = await musicService.generateRandom({
 *   rhythm: '1111',
 *   rhythmType: 16,
 *   tonic: 'C'
 * });
 * 
 * // Generate eighth note pattern with rest in F# major
 * const musicXml2 = await musicService.generateRandom({
 *   rhythm: '01',
 *   rhythmType: 8,
 *   tonic: 'F#'
 * });
 * ```
 */
export const generateRandom = async (params: RandomNotesRequest): Promise<string> => {
  const response = await musicApiClient.post<string>('/random', params);
  return response.data;
};

/**
 * Generate a single note for the note identification game
 * 
 * Creates a measure with one randomly selected diatonic note from the specified
 * scale. Returns both the MusicXML for display and the note information for validation.
 * 
 * @param params - Generation parameters
 * @param params.scale - Scale root note (e.g., "C", "D#", "Bb")
 * @param params.octave - Octave as string (e.g., "4", "5")
 * @returns Promise with note game data including XML and answer
 * @throws ApiError if invalid parameters or generation fails
 * 
 * @example
 * ```typescript
 * // Generate random note in C major scale, octave 4
 * const noteData = await musicService.generateNoteGame({
 *   scale: 'C',
 *   octave: '4'
 * });
 * 
 * console.log(noteData.noteName);    // e.g., "G"
 * console.log(noteData.noteOctave);  // "4"
 * // Render noteData.generatedXml with OpenSheetMusicDisplay
 * // Use noteName and noteOctave to validate user's answer
 * ```
 */
export const generateNoteGame = async (params: NoteGameRequest): Promise<NoteGameResponse> => {
  const response = await musicApiClient.post<NoteGameResponse>('/note-game', params);
  return response.data;
};

/**
 * Validate note name format
 * 
 * Helper function to check if a note name is in valid format before sending to API
 * 
 * @param noteName - Note name to validate (e.g., "C", "D#", "Bb")
 * @returns true if note name is valid format
 * 
 * @example
 * ```typescript
 * musicService.isValidNote('C');   // true
 * musicService.isValidNote('D#');  // true
 * musicService.isValidNote('Bb');  // true
 * musicService.isValidNote('H');   // false
 * musicService.isValidNote('C##'); // false
 * ```
 */
export const isValidNote = (noteName: string): boolean => {
  // Valid note: A-G optionally followed by # or b (flat)
  const noteRegex = /^[A-G](#|b)?$/;
  return noteRegex.test(noteName);
};

/**
 * Validate rhythm pattern format
 * 
 * Helper function to check if a rhythm pattern is valid for the specified type
 * 
 * @param rhythm - Rhythm pattern string (e.g., "1111", "112")
 * @param rhythmType - Note duration type (8 or 16)
 * @returns true if rhythm pattern is valid
 * 
 * @example
 * ```typescript
 * musicService.isValidRhythm('1111', 16); // true
 * musicService.isValidRhythm('112', 16);  // true
 * musicService.isValidRhythm('11', 8);    // true
 * musicService.isValidRhythm('1111', 8);  // false (too long for eighth notes)
 * musicService.isValidRhythm('123', 16);  // false (invalid digit '3')
 * ```
 */
export const isValidRhythm = (rhythm: string, rhythmType: number): boolean => {
  // Rhythm should only contain 0, 1, or 2
  if (!/^[012]+$/.test(rhythm)) {
    return false;
  }
  
  // For eighth notes (type 8), typical patterns are 1-2 digits
  // For sixteenth notes (type 16), typical patterns are 2-4 digits
  if (rhythmType === 8 && rhythm.length > 2) {
    return false;
  }
  if (rhythmType === 16 && rhythm.length > 4) {
    return false;
  }
  
  return true;
};

// Export as default object for convenience
export const musicService = {
  generateMary,
  generateRandom,
  generateNoteGame,
  isValidNote,
  isValidRhythm,
};

export default musicService;

/**
 * Type definitions for the Note Recognition Game
 */

/**
 * Game mode options
 * - time: Game runs for a fixed duration
 * - notes: Game runs until a fixed number of notes are answered
 */
export type GameMode = 'time' | 'notes';

/**
 * Current state of the game
 * - settings: Player is configuring game options
 * - playing: Game is in progress
 * - gameover: Game has ended, showing results
 */
export type GameState = 'settings' | 'playing' | 'gameover';

/**
 * Individual note answer with metadata
 */
export interface NoteAnswer {
  /** The note that was displayed */
  note: string;
  /** Whether the player answered correctly */
  correct: boolean;
  /** Time taken to answer in milliseconds */
  timeToAnswer: number;
}

/**
 * Complete statistics for a finished game
 */
export interface GameStats {
  /** Notes per minute */
  npm: number;
  /** Accuracy percentage (0-100) */
  accuracy: number;
  /** Number of correct answers */
  correct: number;
  /** Total number of questions answered */
  total: number;
  /** Game mode that was used */
  gameMode: GameMode;
  /** Time limit (seconds) or note limit based on mode */
  limit: number;
  /** Musical scale used for the game */
  scale: string;
  /** Octave range used for the game */
  octave: number;
}

/**
 * Configuration for password validation
 */
export interface PasswordRequirement {
  /** Human-readable requirement description */
  label: string;
  /** Whether this requirement is currently met */
  met: boolean;
}

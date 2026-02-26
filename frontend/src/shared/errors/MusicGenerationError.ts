/**
 * MusicGenerationError
 *
 * Custom error class for music generation service failures.
 * Used when the Django music service fails to generate MusicXML or encounters other issues.
 *
 * @example
 * throw new MusicGenerationError('Failed to generate note', {
 *   context: { scale: 'C', octave: 4 }
 * });
 */
export class MusicGenerationError extends Error {
	public readonly name = "MusicGenerationError";
	public readonly context?: Record<string, unknown>;

	constructor(
		message: string,
		options?: { context?: Record<string, unknown> },
	) {
		super(message);
		this.context = options?.context;
		Object.setPrototypeOf(this, MusicGenerationError.prototype);
	}
}

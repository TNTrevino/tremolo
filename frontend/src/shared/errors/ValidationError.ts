/**
 * ValidationError
 *
 * Custom error class for validation failures and malformed data.
 * Typically used for 400 (Bad Request) and 422 (Unprocessable Entity) responses.
 *
 * @example
 * throw new ValidationError('Email is required', {
 *   field: 'email',
 *   statusCode: 400
 * });
 */
export class ValidationError extends Error {
	public readonly name = "ValidationError";
	public readonly field?: string;
	public readonly statusCode?: number;

	constructor(
		message: string,
		options?: { field?: string; statusCode?: number },
	) {
		super(message);
		this.field = options?.field;
		this.statusCode = options?.statusCode;
		Object.setPrototypeOf(this, ValidationError.prototype);
	}
}

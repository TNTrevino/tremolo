/**
 * AuthenticationError
 *
 * Custom error class for authentication and authorization failures.
 * Typically used for 401 (Unauthorized) and 403 (Forbidden) responses.
 *
 * @example
 * throw new AuthenticationError('Invalid credentials', { statusCode: 401 });
 */
export class AuthenticationError extends Error {
	public readonly name = "AuthenticationError";
	public readonly statusCode?: number;

	constructor(message: string, options?: { statusCode?: number }) {
		super(message);
		this.statusCode = options?.statusCode;
		Object.setPrototypeOf(this, AuthenticationError.prototype);
	}
}

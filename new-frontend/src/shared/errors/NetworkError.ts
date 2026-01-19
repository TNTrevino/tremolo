/**
 * NetworkError
 *
 * Custom error class for network-related failures including timeouts,
 * connection issues, and HTTP errors.
 *
 * @example
 * throw new NetworkError('Failed to connect to server', {
 *   statusCode: 503,
 *   isTimeout: false
 * });
 */
export class NetworkError extends Error {
	public readonly name = "NetworkError";
	public readonly statusCode?: number;
	public readonly isTimeout?: boolean;

	constructor(
		message: string,
		options?: { statusCode?: number; isTimeout?: boolean },
	) {
		super(message);
		this.statusCode = options?.statusCode;
		this.isTimeout = options?.isTimeout;
		Object.setPrototypeOf(this, NetworkError.prototype);
	}
}

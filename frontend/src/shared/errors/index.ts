/**
 * Error Classes
 *
 * Domain-specific error classes for consistent error handling across the application.
 * These classes extend the native Error class and provide additional metadata
 * for better error categorization and handling.
 *
 * @example
 * import { NetworkError, ValidationError } from '@/shared/errors';
 *
 * // Throw a network error
 * throw new NetworkError('Connection failed', { statusCode: 503 });
 *
 * // Catch and handle specific error types
 * try {
 *   await fetchData();
 * } catch (error) {
 *   if (error instanceof NetworkError) {
 *     // Handle network errors
 *   } else if (error instanceof ValidationError) {
 *     // Handle validation errors
 *   }
 * }
 */

export { NetworkError } from "./NetworkError";
export { AuthenticationError } from "./AuthenticationError";
export { ValidationError } from "./ValidationError";
export { MusicGenerationError } from "./MusicGenerationError";

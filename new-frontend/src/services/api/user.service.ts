/**
 * User Service
 *
 * Handles user profile, statistics, and note game entry operations.
 * All endpoints communicate with the Go backend (port 5001) and require authentication.
 */

import { mainApiClient } from './client';
import type {
  GeneralUserInfo,
  CreateNoteGameEntryRequest,
  CreateNoteGameEntryResponse,
  NoteGameEntry,
  MultiMetricChartData,
  ChartQueryParams,
} from './types';

/**
 * Get general user information including profile and aggregate stats
 *
 * Requires authentication. Users can only access their own data.
 *
 * @param userId - The user ID to fetch information for
 * @returns Promise with user profile and statistics
 * @throws ApiError if unauthorized or user not found
 *
 * @example
 * ```typescript
 * const userInfo = await userService.getProfile(123);
 * console.log(`${userInfo.first_name} ${userInfo.last_name}`);
 * console.log(`Average NPM: ${userInfo.average_npm}`);
 * console.log(`Total sessions: ${userInfo.total_sessions}`);
 * ```
 */
export const getProfile = async (userId: number): Promise<GeneralUserInfo> => {
  const response = await mainApiClient.get<GeneralUserInfo>(`/api/users/${userId}/general-info`);
  return response.data;
};

/**
 * Update user profile information
 *
 * Note: This endpoint may not be implemented yet in the backend.
 * Placeholder for future implementation.
 *
 * @param userId - The user ID to update
 * @param updates - Partial user data to update
 * @returns Promise with updated user data
 * @throws ApiError if unauthorized or update fails
 */
export const updateProfile = async (
  userId: number,
  updates: Partial<GeneralUserInfo>
): Promise<GeneralUserInfo> => {
  const response = await mainApiClient.patch<GeneralUserInfo>(`/api/users/${userId}`, updates);
  return response.data;
};

/**
 * Get user performance statistics and chart data
 *
 * Retrieves time-series data for NPM, accuracy, session count, and total questions.
 * Data can be aggregated by different time intervals.
 *
 * @param userId - The user ID to fetch stats for
 * @param params - Optional query parameters for data filtering
 * @param params.interval - Time interval for aggregation ('day', 'week', 'month', 'year', 'all')
 * @param params.days - Number of days to include (optional)
 * @returns Promise with multi-metric chart data
 * @throws ApiError if unauthorized or request fails
 *
 * @example
 * ```typescript
 * // Get user stats aggregated by day for the last 30 days
 * const stats = await userService.getStats(123, {
 *   interval: 'day',
 *   days: 30
 * });
 *
 * console.log('NPM over time:', stats.npm);
 * console.log('Accuracy over time:', stats.accuracy);
 * // Use with Chart.js for visualization
 * ```
 */
export const getStats = async (
  userId: number,
  params?: ChartQueryParams
): Promise<MultiMetricChartData> => {
  const queryParams = new URLSearchParams();

  if (params?.interval) {
    queryParams.append('interval', params.interval);
  }

  if (params?.days) {
    queryParams.append('days', params.days.toString());
  }

  const queryString = queryParams.toString();
  const url = `/api/charts/user/${userId}/metrics${queryString ? `?${queryString}` : ''}`;

  const response = await mainApiClient.get<MultiMetricChartData>(url);
  return response.data;
};

/**
 * Save a note game result/entry for a user
 *
 * Records the results of a completed note identification game session.
 * Requires authentication.
 *
 * @param entry - Note game entry data
 * @param entry.time_length - Duration in HH:MM:SS format (e.g., "00:05:30")
 * @param entry.total_questions - Total number of questions attempted
 * @param entry.correct_questions - Number of correct answers
 * @param entry.user_id - User ID (must match authenticated user)
 * @param entry.notes_per_minute - Calculated notes per minute metric
 * @returns Promise with creation confirmation and entry ID
 * @throws ApiError if validation fails or unauthorized
 *
 * @example
 * ```typescript
 * const result = await userService.saveGameResult({
 *   time_length: '00:05:30',
 *   total_questions: 20,
 *   correct_questions: 18,
 *   user_id: 123,
 *   notes_per_minute: 65
 * });
 *
 * console.log(`Entry saved with ID: ${result.id}`);
 * console.log(result.message);
 * ```
 */
export const saveGameResult = async (
  entry: CreateNoteGameEntryRequest
): Promise<CreateNoteGameEntryResponse> => {
  const response = await mainApiClient.post<CreateNoteGameEntryResponse>(
    '/api/note-game/entry',
    entry
  );
  return response.data;
};

/**
 * Get recent note game entries for a user
 *
 * Retrieves the last 30 note game entries for the authenticated user.
 * Useful for displaying recent activity and progress tracking.
 *
 * @returns Promise with array of recent note game entries
 * @throws ApiError if unauthorized or request fails
 *
 * @example
 * ```typescript
 * const recentGames = await userService.getRecentGameEntries();
 *
 * recentGames.forEach(entry => {
 *   console.log(`Date: ${entry.created_date}`);
 *   console.log(`Score: ${entry.correct_questions}/${entry.total_questions}`);
 *   console.log(`NPM: ${entry.notes_per_minute}`);
 * });
 * ```
 */
export const getRecentGameEntries = async (): Promise<NoteGameEntry[]> => {
  const response = await mainApiClient.get<NoteGameEntry[]>('/api/note-game/recent');
  return response.data;
};

/**
 * Get teacher's class metrics (aggregated across all students)
 *
 * Retrieves performance metrics for all students associated with a teacher.
 * Only available to users with 'teacher' role.
 *
 * @param params - Optional query parameters for data filtering
 * @param params.interval - Time interval for aggregation
 * @param params.days - Number of days to include
 * @returns Promise with aggregated class metrics
 * @throws ApiError if unauthorized or user is not a teacher
 *
 * @example
 * ```typescript
 * // Get class metrics for the last 7 days
 * const classMetrics = await userService.getClassMetrics({
 *   interval: 'day',
 *   days: 7
 * });
 *
 * console.log('Class average NPM:', classMetrics.npm);
 * console.log('Class average accuracy:', classMetrics.accuracy);
 * ```
 */
export const getClassMetrics = async (params?: ChartQueryParams): Promise<MultiMetricChartData> => {
  const queryParams = new URLSearchParams();

  if (params?.interval) {
    queryParams.append('interval', params.interval);
  }

  if (params?.days) {
    queryParams.append('days', params.days.toString());
  }

  const queryString = queryParams.toString();
  const url = `/api/charts/teacher/class-metrics${queryString ? `?${queryString}` : ''}`;

  const response = await mainApiClient.get<MultiMetricChartData>(url);
  return response.data;
};

/**
 * Format time length for API submission
 *
 * Helper function to convert seconds or milliseconds to HH:MM:SS format
 * required by the backend.
 *
 * @param seconds - Time in seconds
 * @returns Time string in HH:MM:SS format
 *
 * @example
 * ```typescript
 * const formatted = userService.formatTimeLength(330); // "00:05:30"
 * const formatted2 = userService.formatTimeLength(3665); // "01:01:05"
 * ```
 */
export const formatTimeLength = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return [hours, minutes, secs].map((val) => String(val).padStart(2, '0')).join(':');
};

/**
 * Calculate notes per minute metric
 *
 * Helper function to calculate NPM based on correct questions and time length
 *
 * @param correctQuestions - Number of correct answers
 * @param timeInSeconds - Total time in seconds
 * @returns Notes per minute (rounded to nearest integer)
 *
 * @example
 * ```typescript
 * const npm = userService.calculateNPM(20, 300); // 20 correct in 5 minutes = 4 NPM
 * ```
 */
export const calculateNPM = (correctQuestions: number, timeInSeconds: number): number => {
  if (timeInSeconds === 0) return 0;

  const minutes = timeInSeconds / 60;
  const npm = correctQuestions / minutes;

  return Math.round(npm);
};

/**
 * Change user password
 *
 * Updates the password for the authenticated user. Requires the current password
 * for verification before setting the new password.
 *
 * @param userId - The user ID to change password for
 * @param data - Password change data
 * @param data.currentPassword - The user's current password for verification
 * @param data.newPassword - The new password to set
 * @returns Promise with success message
 * @throws ApiError if current password is incorrect or request fails
 *
 * @example
 * ```typescript
 * const result = await userService.changePassword(123, {
 *   currentPassword: 'oldPassword123',
 *   newPassword: 'newSecurePassword456'
 * });
 * console.log(result.message); // "Password updated successfully"
 * ```
 */
export const changePassword = async (
  userId: number,
  data: { currentPassword: string; newPassword: string }
): Promise<{ message: string }> => {
  const response = await mainApiClient.post(`/api/users/${userId}/change-password`, data);
  return response.data;
};

/**
 * Delete user account
 *
 * Permanently deletes the user's account and all associated data.
 * This action cannot be undone.
 *
 * @param userId - The user ID to delete
 * @returns Promise with confirmation message
 * @throws ApiError if unauthorized or deletion fails
 *
 * @example
 * ```typescript
 * const result = await userService.deleteAccount(123);
 * console.log(result.message); // "Account deleted successfully"
 * ```
 */
export const deleteAccount = async (userId: number): Promise<{ message: string }> => {
  const response = await mainApiClient.delete(`/api/users/${userId}`);
  return response.data;
};

/**
 * Download all user data (GDPR)
 *
 * Downloads a complete export of all user data for GDPR compliance.
 * Returns data as a Blob that can be saved as a file.
 *
 * @param userId - The user ID to export data for
 * @returns Promise with Blob containing user data export
 * @throws ApiError if unauthorized or export fails
 *
 * @example
 * ```typescript
 * const blob = await userService.downloadUserData(123);
 * const url = URL.createObjectURL(blob);
 * const link = document.createElement('a');
 * link.href = url;
 * link.download = 'user-data-export.json';
 * link.click();
 * ```
 */
export const downloadUserData = async (userId: number): Promise<Blob> => {
  const response = await mainApiClient.get(`/api/users/${userId}/data-export`, {
    responseType: 'blob',
  });
  return response.data;
};

// Export as default object for convenience
export const userService = {
  getProfile,
  updateProfile,
  getStats,
  saveGameResult,
  getRecentGameEntries,
  getClassMetrics,
  formatTimeLength,
  calculateNPM,
  changePassword,
  deleteAccount,
  downloadUserData,
};

export default userService;

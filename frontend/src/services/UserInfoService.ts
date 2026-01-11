import { apiClient, isOk } from "./axiosInstance";
import { GeneralUserInfo } from "../DTOs/user";
import { AuthService } from "./AuthService";

/**
 * User Info Service
 * Handles API calls for fetching user information and statistics
 */
export const UserInfoService = {
	/**
	 * Fetch general user information including join date and total stats
	 * @param userId - User ID to fetch information for
	 * @returns Promise with general user information
	 * @throws Error if authentication fails or request fails
	 */
	async getGeneralUserInfo(userId: number): Promise<GeneralUserInfo> {
		try {
			const token = AuthService.getToken();

			if (!token) {
				throw new Error("Authentication required");
			}

			const response = await apiClient.get<GeneralUserInfo>(
				`/api/users/${userId}/general-info`,
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				},
			);

			if (!isOk(response)) {
				throw new Error(`Failed to fetch user information: ${response.status}`);
			}

			return response.data;
		} catch (error) {
			console.error("Error fetching general user info:", error);
			throw error instanceof Error
				? error
				: new Error("Failed to fetch user information");
		}
	},
};

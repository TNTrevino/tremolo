import { AxiosError, type AxiosInstance } from "axios";
import type {
	ColorSchemeResponse,
	CreateColorSchemeRequest,
	UpdateColorSchemeRequest,
	SetActiveSchemeRequest,
	SetPreferredSchemesRequest,
} from "./types";

export class ColorSchemeService {
	constructor(private client: AxiosInstance) {}

	async getColorSchemes(): Promise<ColorSchemeResponse[]> {
		const response =
			await this.client.get<ColorSchemeResponse[]>("/api/color-schemes");
		return response.data;
	}

	async getActiveColorScheme(): Promise<ColorSchemeResponse | null> {
		try {
			const response = await this.client.get<ColorSchemeResponse>(
				"/api/color-schemes/active",
			);
			return response.data;
		} catch (error) {
			if (error instanceof AxiosError && error.response?.status === 404) {
				return null;
			}
			throw error;
		}
	}

	async createColorScheme(
		req: CreateColorSchemeRequest,
	): Promise<ColorSchemeResponse> {
		const response = await this.client.post<ColorSchemeResponse>(
			"/api/color-schemes",
			req,
		);
		return response.data;
	}

	async updateColorScheme(
		id: number,
		req: UpdateColorSchemeRequest,
	): Promise<ColorSchemeResponse> {
		const response = await this.client.put<ColorSchemeResponse>(
			`/api/color-schemes/${id}`,
			req,
		);
		return response.data;
	}

	async deleteColorScheme(id: number): Promise<void> {
		await this.client.delete(`/api/color-schemes/${id}`);
	}

	async setActiveScheme(req: SetActiveSchemeRequest): Promise<void> {
		await this.client.put("/api/color-schemes/active", req);
	}

	async toggleScheme(): Promise<ColorSchemeResponse> {
		const response = await this.client.put<ColorSchemeResponse>(
			"/api/color-schemes/toggle",
		);
		return response.data;
	}

	async setPreferredSchemes(req: SetPreferredSchemesRequest): Promise<void> {
		await this.client.put("/api/color-schemes/preferences", req);
	}
}

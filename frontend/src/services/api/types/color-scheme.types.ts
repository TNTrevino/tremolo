/**
 * Color Scheme Type Definitions
 *
 * Types for user-configurable color schemes and theme preferences.
 * Corresponds to the Go user service API at /api/color-schemes.
 */

export interface ColorSchemeColors {
	background: string;
	foreground: string;
	card: string;
	card_foreground: string;
	popover: string;
	popover_foreground: string;
	primary: string;
	primary_foreground: string;
	secondary: string;
	secondary_foreground: string;
	muted: string;
	muted_foreground: string;
	accent: string;
	accent_foreground: string;
	destructive: string;
	destructive_foreground: string;
	border: string;
	input: string;
	ring: string;
}

export interface ColorSchemeResponse {
	id: number;
	user_id: number;
	name: string;
	is_preset: boolean;
	is_dark: boolean;
	colors: ColorSchemeColors;
}

export interface CreateColorSchemeRequest {
	name: string;
	is_dark: boolean;
	colors: ColorSchemeColors;
}

export interface UpdateColorSchemeRequest {
	name: string;
	is_dark: boolean;
	colors: ColorSchemeColors;
}

export interface SetActiveSchemeRequest {
	scheme_id: number;
}

export interface SetPreferredSchemesRequest {
	light_scheme_id: number;
	dark_scheme_id: number;
}

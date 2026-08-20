const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_OAUTH_STATE_KEY = "google_oauth_state";

function generateState(): string {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function getGoogleOAuthURL(): string {
	const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
	if (!clientId) {
		throw new Error(
			"Google OAuth is not configured: VITE_GOOGLE_CLIENT_ID is missing",
		);
	}
	const redirectUri = getRedirectUri();
	const state = generateState();

	sessionStorage.setItem(GOOGLE_OAUTH_STATE_KEY, state);

	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: "code",
		scope: "openid email profile",
		state: state,
		access_type: "online",
		prompt: "select_account",
	});

	return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export function verifyOAuthState(state: string): boolean {
	const stored = sessionStorage.getItem(GOOGLE_OAUTH_STATE_KEY);
	sessionStorage.removeItem(GOOGLE_OAUTH_STATE_KEY);
	return stored === state;
}

export function getRedirectUri(): string {
	return `${window.location.origin}/auth/google/callback`;
}

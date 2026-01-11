/// <reference types="vite/client" />
/// <reference lib="dom" />
// idk we need the above for typescript to leave us alone
// https://stackoverflow.com/questions/76724585/vercel-vite-cannot-find-type-definition-for-vite-client

export function devEnvironmentCheck(): void {
	const mainApi = import.meta.env.VITE_BACKEND_MAIN;
	const musicApi = import.meta.env.VITE_BACKEND_MUSIC;

	if (!mainApi) {
		console.error("❌ VITE_BACKEND_MAIN environment variable not set");
		throw new Error("Development misconfigured. Set VITE_BACKEND_MAIN.");
	}

	if (!musicApi) {
		console.error("❌ VITE_BACKEND_MUSIC environment variable not set");
		throw new Error("Development misconfigured. Set VITE_BACKEND_MUSIC.");
	}
}

export function prodEnvironmentCheck(): void {
	const mainApi = import.meta.env.VITE_BACKEND_MAIN;
	const musicApi = import.meta.env.VITE_BACKEND_MUSIC;

	if (!mainApi) {
		console.error("❌ VITE_BACKEND_MAIN environment variable not set");
		throw new Error("Production misconfigured. Set VITE_BACKEND_MAIN.");
	}

	if (!musicApi) {
		console.error("❌ VITE_BACKEND_MUSIC environment variable not set");
		throw new Error("Production misconfigured. Set VITE_BACKEND_MUSIC.");
	}

	// enforce https
	if (!mainApi.startsWith("https://")) {
		console.error(
			`❌ VITE_BACKEND_MAIN must use https in production: ${mainApi}`,
		);
		throw new Error("HTTPS required for production. Update VITE_BACKEND_MAIN.");
	}

	if (!musicApi.startsWith("https://")) {
		console.error(
			`❌ VITE_BACKEND_MUSIC must use https in production: ${musicApi}`,
		);
		throw new Error(
			"HTTPS required for production. Update VITE_BACKEND_MUSIC.",
		);
	}
}

export function environmentAndHttpsCheck(): void {
	if (import.meta.env.PROD) {
		prodEnvironmentCheck();
	} else {
		devEnvironmentCheck();
	}

	if (import.meta.env.PROD && window.location.protocol === "http:") {
		console.warn("⚠️  Redirecting to HTTPS...");
		window.location.href = window.location.href.replace("http:", "https:");
	}
}

export function buildTimeEnvironmentCheck(
	env: Record<string, string | undefined>,
): void {
	const nodeEnv = env.NODE_ENV;

	if (nodeEnv !== "production") {
		console.log(
			"ℹ️  Development mode: Skipping HTTPS validation for environment variables\n",
		);
		return;
	}

	console.log("\n🔒 Validating production environment configuration...\n");

	const DEFAULT_MAIN_API = "https://placeholder-main-api.example.com";
	const DEFAULT_MUSIC_API = "https://placeholder-music-api.example.com";

	let mainApi = env.VITE_BACKEND_MAIN;
	let musicApi = env.VITE_BACKEND_MUSIC;

	if (!mainApi) {
		console.error(
			"❌ WARNING: VITE_BACKEND_MAIN is not set.\n" +
				"   Set this environment variable to your main API URL.\n" +
				"   Example: export VITE_BACKEND_MAIN=https://api.tremolo.com\n" +
				`   Using default placeholder: ${DEFAULT_MAIN_API}\n`,
		);
		mainApi = DEFAULT_MAIN_API;
	}

	if (!mainApi.startsWith("https://")) {
		console.error(
			"❌ WARNING: VITE_BACKEND_MAIN must use HTTPS in production.\n" +
				`   Current value: ${mainApi}\n` +
				"   Update to: https://...\n" +
				"   HTTP is not allowed for security reasons (prevents MITM attacks).\n" +
				`   Using default placeholder: ${DEFAULT_MAIN_API}\n`,
		);
		mainApi = DEFAULT_MAIN_API;
	}

	if (!musicApi) {
		console.error(
			"❌ WARNING: VITE_BACKEND_MUSIC is not set.\n" +
				"   Set this environment variable to your music API URL.\n" +
				"   Example: export VITE_BACKEND_MUSIC=https://music.tremolo.com\n" +
				`   Using default placeholder: ${DEFAULT_MUSIC_API}\n`,
		);
		musicApi = DEFAULT_MUSIC_API;
	}

	if (!musicApi.startsWith("https://")) {
		console.error(
			"❌ WARNING: VITE_BACKEND_MUSIC must use HTTPS in production.\n" +
				`   Current value: ${musicApi}\n` +
				"   Update to: https://...\n" +
				"   HTTP is not allowed for security reasons (prevents MITM attacks).\n" +
				`   Using default placeholder: ${DEFAULT_MUSIC_API}\n`,
		);
		musicApi = DEFAULT_MUSIC_API;
	}

	console.log("✅ VITE_BACKEND_MAIN:", mainApi);
	console.log("✅ VITE_BACKEND_MUSIC:", musicApi);
	console.log("✅ Environment validation passed!\n");
}

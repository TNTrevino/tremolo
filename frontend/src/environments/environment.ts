/**
 * Development environment.
 *
 * Replaces the React app's `import.meta.env.VITE_*` reads. Angular swaps
 * this file for `environment.prod.ts` via angular.json's `fileReplacements`
 * on a production build, so the values below are the local-dev defaults and
 * every consumer imports this path only.
 */
export const environment = {
	production: false,

	/** Go "user tracking" service -- auth, users, classes, scores (was VITE_BACKEND_MAIN). */
	coreApi: "http://localhost:5001",

	/** Python "music generation" service -- exercises and MusicXML (was VITE_BACKEND_MUSIC). */
	musicApi: "http://localhost:8000",

	/** Was VITE_APP_NAME. */
	appName: "Tremolo",

	/**
	 * Was VITE_GOOGLE_CLIENT_ID. The Tremolo-OAuth-Test client, which
	 * whitelists http://localhost:4200 -- a client id is public (the prod
	 * bundle ships its own to every visitor); only the client secret is
	 * secret, and that lives server-side in the Go service's env.
	 */
	googleClientId:
		"965194502410-n4tl1vpvovqorak78bvr5lfjana842dm.apps.googleusercontent.com",
};

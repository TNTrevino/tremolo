/**
 * Production environment.
 *
 * Substituted for `environment.ts` by angular.json's `fileReplacements` on
 * a production `ng build`.
 *
 */
export const environment = {
	production: true,
	coreApi: "%VITE_BACKEND_MAIN%",
	musicApi: "%VITE_BACKEND_MUSIC%",
	appName: "%VITE_APP_NAME%",
	googleClientId: "%VITE_GOOGLE_CLIENT_ID%",
};

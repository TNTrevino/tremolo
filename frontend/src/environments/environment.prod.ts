/**
 * Production environment.
 *
 * Substituted for `environment.ts` by angular.json's `fileReplacements` on
 * `ng build`. The React app read these from Vite env vars supplied by the
 * deploy workflow; the values here are filled in at Phase 7 cutover, when
 * the deploy pipeline points at this app.
 */
export const environment = {
	production: true,
	mainApi: "",
	musicApi: "",
	appName: "Tremolo",
	googleClientId: "",
};

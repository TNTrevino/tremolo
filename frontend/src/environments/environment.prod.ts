/**
 * Production environment.
 *
 * Substituted for `environment.ts` by angular.json's `fileReplacements` on
 * a production `ng build`.
 *
 * **The deploy workflow overwrites this file before it builds.**
 * `.github/workflows/deploy.yml` generates it from `/etc/tremolo/.env` on
 * the target machine -- the same file the React build sourced its `VITE_*`
 * vars from -- and fails the deploy if `VITE_BACKEND_MAIN`,
 * `VITE_BACKEND_MUSIC` or `VITE_GOOGLE_CLIENT_ID` is missing. That is
 * because one workflow serves two targets with different API hosts (prod on
 * `geekom`, QA on `pi`), so no single committed value is right for both, and
 * because the OAuth client id belongs with the deployment config.
 *
 * The values below are therefore what a *local* production build gets, not
 * what production runs on. They are left empty rather than pointed at the
 * real API on purpose: an empty `mainApi` makes a local production bundle
 * visibly non-functional instead of quietly talking to the live service.
 * `core/interceptors/api-url.ts` guards on `mainApi.length > 0`.
 */
export const environment = {
	production: true,
	mainApi: "",
	musicApi: "",
	appName: "Tremolo",
	googleClientId: "",
};

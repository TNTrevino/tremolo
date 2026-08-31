import { Routes } from "@angular/router";

import { authGuard } from "./auth/services/security/auth.guard";
import { guestGuard } from "./auth/services/security/guest.guard";
import { teacherGuard } from "./auth/services/security/teacher.guard";

/**
 * The routes ported from frontend-react/src/App.tsx, plus additions with
 * no React predecessor: `classes/:id/students/:studentId` (the teacher's
 * read-only view of a student's stats), the token-bearing email link
 * routes, and /privacy and /terms.
 *
 * Guard assignments are one for one with the wrapper components they
 * replace: ProtectedRoute x5 -> `authGuard`, GuestRoute x2 -> `guestGuard`,
 * TeacherRoute x2 -> `teacherGuard`. The student-stats route reuses
 * `teacherGuard` too, with no React wrapper to port from, so 3 routes carry
 * it in total. Every other route is public, including all five games --
 * they are playable signed out, and that is deliberate.
 *
 * `loadComponent` everywhere is the port of React's `lazy()` imports.
 * `/classes/:id` and `/assignments/:id/play` bind `:id` to an `input()` on
 * the page, which `withComponentInputBinding()` in app.config.ts turns on.
 *
 * **`runGuardsAndResolvers: "always"` on every signed-in-only route.** React's
 * `ProtectedRoute` re-rendered whenever the auth store changed, so logging out
 * on a guarded page bounced the visitor to /login. Angular has no such
 * re-render: logging out re-navigates the current URL (see
 * `NavigationComponent.logout`), and `onSameUrlNavigation: "reload"`
 * (app.config.ts) is what lets that same-URL navigation run at all. It is
 * **not** enough on its own -- the default `runGuardsAndResolvers` is
 * `"paramsOrQueryParamsChange"`, and re-navigating to an identical URL changes
 * neither, so `canActivate` never re-runs and the signed-out visitor keeps
 * looking at the guarded page. `"always"` is the half that re-runs the guard.
 * Both halves are covered by `app.routes.spec.ts`.
 *
 * The two guest-only routes deliberately do not carry it: nothing re-navigates
 * /login or /signup in place, and signing in navigates away explicitly.
 */
export const routes: Routes = [
	// "/" lands on the note game, not on /home. Long-standing behaviour and
	// the parity suite pins it.
	{ path: "", pathMatch: "full", redirectTo: "/note-game" },

	// --- Public ---------------------------------------------------------
	{
		path: "home",
		loadComponent: () =>
			import("./public/home-page/home-page.component").then(
				(m) => m.HomePageComponent,
			),
	},
	{
		path: "about",
		loadComponent: () =>
			import("./public/about-page/about-page.component").then(
				(m) => m.AboutPageComponent,
			),
	},
	{
		path: "privacy",
		loadComponent: () =>
			import("./public/privacy-page/privacy-page.component").then(
				(m) => m.PrivacyPageComponent,
			),
	},
	{
		path: "terms",
		loadComponent: () =>
			import("./public/terms-page/terms-page.component").then(
				(m) => m.TermsPageComponent,
			),
	},
	{
		path: "note-game",
		loadComponent: () =>
			import("./features/note-game/components/note-game-page/note-game-page.component").then(
				(m) => m.NoteGamePageComponent,
			),
	},
	{
		path: "key-signature-game",
		loadComponent: () =>
			import("./features/identification-game/components/key-signature-game-page/key-signature-game-page.component").then(
				(m) => m.KeySignatureGamePageComponent,
			),
	},
	{
		path: "interval-game",
		loadComponent: () =>
			import("./features/identification-game/components/interval-game-page/interval-game-page.component").then(
				(m) => m.IntervalGamePageComponent,
			),
	},
	{
		path: "scale-game",
		loadComponent: () =>
			import("./features/identification-game/components/scale-game-page/scale-game-page.component").then(
				(m) => m.ScaleGamePageComponent,
			),
	},
	{
		path: "chord-game",
		loadComponent: () =>
			import("./features/identification-game/components/chord-game-page/chord-game-page.component").then(
				(m) => m.ChordGamePageComponent,
			),
	},
	{
		path: "sheet-music",
		loadComponent: () =>
			import("./features/sheet-music/components/sheet-music-page/sheet-music-page.component").then(
				(m) => m.SheetMusicPageComponent,
			),
	},
	{
		path: "convert",
		loadComponent: () =>
			import("./features/sheet-music/components/converter-page/converter-page.component").then(
				(m) => m.ConverterPageComponent,
			),
	},
	{
		path: "auth/google/callback",
		loadComponent: () =>
			import("./auth/components/google-callback/google-callback-page.component").then(
				(m) => m.GoogleCallbackPageComponent,
			),
	},

	// --- Not part of the app ---------------------------------------------
	// The Phase 2 UI-kit showcase. Unguarded, imported by nothing, and
	// removable by deleting this entry plus src/app/dev/.
	{
		path: "dev/kit",
		loadComponent: () =>
			import("./dev/kit-page/kit-page.component").then(
				(m) => m.KitPageComponent,
			),
	},

	// --- Guest only (was GuestRoute) -------------------------------------
	{
		path: "login",
		canActivate: [guestGuard],
		loadComponent: () =>
			import("./auth/components/login/login.component").then(
				(m) => m.LoginPageComponent,
			),
	},
	{
		path: "signup",
		canActivate: [guestGuard],
		loadComponent: () =>
			import("./auth/components/signup/signup-page.component").then(
				(m) => m.SignupPageComponent,
			),
	},
	{
		path: "forgot-password",
		canActivate: [guestGuard],
		loadComponent: () =>
			import("./auth/components/forgot-password/forgot-password-page.component").then(
				(m) => m.ForgotPasswordPageComponent,
			),
	},

	// --- Signed in (was ProtectedRoute) ----------------------------------
	{
		path: "dashboard",
		canActivate: [authGuard],
		runGuardsAndResolvers: "always",
		loadComponent: () =>
			import("./features/dashboard/components/dashboard-page/dashboard-page.component").then(
				(m) => m.DashboardPageComponent,
			),
	},
	{
		path: "profile",
		canActivate: [authGuard],
		runGuardsAndResolvers: "always",
		loadComponent: () =>
			import("./features/account/components/profile-page/profile-page.component").then(
				(m) => m.ProfilePageComponent,
			),
	},
	{
		path: "account",
		canActivate: [authGuard],
		runGuardsAndResolvers: "always",
		loadComponent: () =>
			import("./features/account/components/account-page/account-page.component").then(
				(m) => m.AccountPageComponent,
			),
	},
	{
		path: "assignments",
		canActivate: [authGuard],
		runGuardsAndResolvers: "always",
		loadComponent: () =>
			import("./features/classes/components/assignments-page/assignments-page.component").then(
				(m) => m.AssignmentsPageComponent,
			),
	},
	{
		path: "assignments/:id/play",
		canActivate: [authGuard],
		runGuardsAndResolvers: "always",
		loadComponent: () =>
			import("./features/classes/components/assignment-play-page/assignment-play-page.component").then(
				(m) => m.AssignmentPlayPageComponent,
			),
	},

	// --- Teachers only (was TeacherRoute) --------------------------------
	{
		path: "classes",
		canActivate: [teacherGuard],
		runGuardsAndResolvers: "always",
		loadComponent: () =>
			import("./features/classes/components/classes-page/classes-page.component").then(
				(m) => m.ClassesPageComponent,
			),
	},
	{
		path: "classes/:id",
		canActivate: [teacherGuard],
		runGuardsAndResolvers: "always",
		loadComponent: () =>
			import("./features/classes/components/class-detail-page/class-detail-page.component").then(
				(m) => m.ClassDetailPageComponent,
			),
	},
	{
		path: "classes/:id/students/:studentId",
		canActivate: [teacherGuard],
		runGuardsAndResolvers: "always",
		loadComponent: () =>
			import("./features/classes/components/student-stats-page/student-stats-page.component").then(
				(m) => m.StudentStatsPageComponent,
			),
	},

	// --- Token-bearing links from email (deliberately unguarded) ---
	// A link from an email must work even when a stale session is signed in
	// on the device; guestGuard would bounce the visitor to /dashboard.
	{
		path: "reset-password",
		loadComponent: () =>
			import("./auth/components/reset-password/reset-password-page.component").then(
				(m) => m.ResetPasswordPageComponent,
			),
	},
	{
		path: "verify-email",
		loadComponent: () =>
			import("./auth/components/verify-email/verify-email-page.component").then(
				(m) => m.VerifyEmailPageComponent,
			),
	},
	{
		path: "confirm-email-change",
		loadComponent: () =>
			import("./auth/components/confirm-email-change/confirm-email-change-page.component").then(
				(m) => m.ConfirmEmailChangePageComponent,
			),
	},
];

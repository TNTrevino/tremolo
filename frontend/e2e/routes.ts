/**
 * The app's 20 routes, as declared in frontend-react/src/App.tsx.
 *
 * Shared by the navigation spec and the screenshot baselines so the two
 * can never drift from each other. `access` is what the route's guard
 * requires, which decides who has to be signed in to photograph it:
 *
 *  - `public`   no guard
 *  - `guest`    GuestRoute   -- signed-in users are bounced away
 *  - `student`  ProtectedRoute
 *  - `teacher`  TeacherRoute
 */
export interface AppRoute {
	/** Path to visit. Parameterised routes carry a `:id` placeholder. */
	path: string;
	/** Stable slug used to name this route's screenshot files. */
	slug: string;
	access: "public" | "guest" | "student" | "teacher";
	/** True when the route renders an OSMD staff that must be masked. */
	dynamic?: boolean;
}

export const ROUTES: AppRoute[] = [
	{ path: "/", slug: "root-redirect", access: "public", dynamic: true },
	{ path: "/home", slug: "home", access: "public" },
	{ path: "/about", slug: "about", access: "public" },
	{ path: "/login", slug: "login", access: "guest" },
	{ path: "/signup", slug: "signup", access: "guest" },
	{ path: "/note-game", slug: "note-game", access: "public", dynamic: true },
	{
		path: "/key-signature-game",
		slug: "key-signature-game",
		access: "public",
		dynamic: true,
	},
	{
		path: "/interval-game",
		slug: "interval-game",
		access: "public",
		dynamic: true,
	},
	{ path: "/scale-game", slug: "scale-game", access: "public", dynamic: true },
	{ path: "/chord-game", slug: "chord-game", access: "public", dynamic: true },
	{
		path: "/sheet-music",
		slug: "sheet-music",
		access: "public",
		dynamic: true,
	},
	{ path: "/convert", slug: "convert", access: "public" },
	{
		path: "/auth/google/callback",
		slug: "google-callback",
		access: "public",
	},
	{ path: "/dashboard", slug: "dashboard", access: "student", dynamic: true },
	{ path: "/profile", slug: "profile", access: "student" },
	{ path: "/account", slug: "account", access: "student" },
	{ path: "/classes", slug: "classes", access: "teacher" },
	{ path: "/classes/:id", slug: "class-detail", access: "teacher" },
	{ path: "/assignments", slug: "assignments", access: "student" },
	{
		path: "/assignments/:id/play",
		slug: "assignment-play",
		access: "student",
		dynamic: true,
	},
];

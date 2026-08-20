import { APIRequestContext, request } from "@playwright/test";

/**
 * Direct client for the Go "user tracking" service.
 *
 * Every spec seeds its own world through this rather than by driving the
 * UI: seeding through the UI would make the fixtures depend on the very
 * screens under test, and the suite has to run unchanged against an
 * Angular app whose screens do not exist yet.
 */
const MAIN_API = process.env["E2E_MAIN_API"] ?? "http://localhost:5001";

export interface SeededUser {
	id: number;
	email: string;
	password: string;
	firstName: string;
	lastName: string;
	role: "STUDENT" | "TEACHER";
	accessToken: string;
	refreshToken: string;
}

export interface SeededClass {
	id: number;
	name: string;
	joinCode: string;
}

export interface SeededAssignment {
	id: number;
	title: string;
}

/**
 * Every seeded record carries this, so a spec's assertions can never match
 * a leftover row from an earlier run against the same database.
 */
export function unique(prefix: string): string {
	return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function ctx(): Promise<APIRequestContext> {
	return request.newContext({ baseURL: MAIN_API });
}

async function json(response: {
	ok(): boolean;
	status(): number;
	text(): Promise<string>;
}): Promise<Record<string, unknown>> {
	const body = await response.text();
	if (!response.ok()) {
		throw new Error(`main API ${response.status()}: ${body}`);
	}
	return JSON.parse(body) as Record<string, unknown>;
}

/** Registers a user and logs them straight back in for their tokens. */
export async function createUser(
	role: "STUDENT" | "TEACHER",
	overrides: Partial<Pick<SeededUser, "firstName" | "lastName">> = {},
): Promise<SeededUser> {
	const api = await ctx();
	try {
		const email = `${unique("e2e")}@tremolo.test`;
		const password = "E2ePassw0rd!";
		const firstName =
			overrides.firstName ?? (role === "TEACHER" ? "Tina" : "Sam");
		const lastName = overrides.lastName ?? unique("Case").replace(/-/g, "");

		await json(
			await api.post("/api/auth/register", {
				data: {
					email,
					password,
					first_name: firstName,
					last_name: lastName,
					role,
				},
			}),
		);

		const session = await json(
			await api.post("/api/auth/login", { data: { email, password } }),
		);
		const user = session["user"] as { id: number };

		return {
			id: user.id,
			email,
			password,
			firstName,
			lastName,
			role,
			accessToken: session["access_token"] as string,
			refreshToken: session["refresh_token"] as string,
		};
	} finally {
		await api.dispose();
	}
}

export async function createClass(
	teacher: SeededUser,
	name = unique("Class"),
): Promise<SeededClass> {
	const api = await ctx();
	try {
		const body = await json(
			await api.post("/api/classes", {
				headers: { Authorization: `Bearer ${teacher.accessToken}` },
				data: { name },
			}),
		);
		return {
			id: body["id"] as number,
			name: body["name"] as string,
			joinCode: body["join_code"] as string,
		};
	} finally {
		await api.dispose();
	}
}

export async function joinClass(
	student: SeededUser,
	joinCode: string,
): Promise<void> {
	const api = await ctx();
	try {
		await json(
			await api.post("/api/classes/join", {
				headers: { Authorization: `Bearer ${student.accessToken}` },
				data: { join_code: joinCode },
			}),
		);
	} finally {
		await api.dispose();
	}
}

export async function createAssignment(
	teacher: SeededUser,
	classId: number,
	options: { title?: string; gameType?: string; config?: unknown } = {},
): Promise<SeededAssignment> {
	const api = await ctx();
	try {
		const title = options.title ?? unique("Assignment");
		const body = await json(
			await api.post(`/api/classes/${classId}/assignments`, {
				headers: { Authorization: `Bearer ${teacher.accessToken}` },
				data: {
					title,
					game_type: options.gameType ?? "key_signature",
					config: options.config ?? {
						gameMode: "notes",
						noteLimit: 10,
						timeLimit: 60,
					},
				},
			}),
		);
		return { id: body["id"] as number, title };
	} finally {
		await api.dispose();
	}
}

/**
 * The score entries a user has saved. The game specs assert against this
 * rather than against a dashboard number: it proves the score reached the
 * database, and it reads the same on both frontends.
 */
export async function recentEntries(
	user: SeededUser,
	gameType?: string,
): Promise<Record<string, unknown>[]> {
	const api = await ctx();
	try {
		const response = await api.get("/api/note-game/recent", {
			headers: { Authorization: `Bearer ${user.accessToken}` },
			params: gameType ? { game_type: gameType } : {},
		});
		const body = await response.text();
		if (!response.ok()) {
			throw new Error(`main API ${response.status()}: ${body}`);
		}
		const parsed: unknown = JSON.parse(body);
		return Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : [];
	} finally {
		await api.dispose();
	}
}

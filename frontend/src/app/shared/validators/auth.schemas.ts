import { z } from "zod";

/**
 * Port of frontend-react/src/features/auth/validation/schemas.ts, verbatim
 * -- same rules, same messages.
 *
 * D11: zod stays. Signal Forms accept any Standard Schema through
 * `validateStandardSchema`, and zod v4 implements it, so these objects
 * plug straight into a form schema:
 *
 * ```ts
 * readonly form = form(this.model, (path) => {
 *   validateStandardSchema(path, loginSchema);
 * });
 * ```
 *
 * The Go service validates the same things server-side (Phase 1 probed it:
 * names need >= 2 characters, passwords >= 8, and failures come back 400
 * with `{"error": "..."}`), so these are a courtesy to the user, not the
 * gate.
 */
export const loginSchema = z.object({
	email: z.string().email("Invalid email format"),
	password: z.string().min(1, "Password is required"),
});

export const signupSchema = z
	.object({
		firstName: z
			.string()
			.min(2, "At least 2 characters")
			.regex(/^[a-zA-Z]+$/, "Only letters"),
		lastName: z
			.string()
			.min(2, "At least 2 characters")
			.regex(/^[a-zA-Z]+$/, "Only letters"),
		email: z.email("Invalid email format"),
		password: z
			.string()
			.min(8, "At least 8 characters")
			// bcrypt's hard limit (#269 review): a password past this
			// silently reaches bcrypt.GenerateFromPassword server-side and
			// errors, so this is a courtesy that matches the Go DTO's own
			// cap, not a new policy choice.
			.max(72, "At most 72 characters")
			.regex(/[A-Z]/, "Contains uppercase letter")
			.regex(/[a-z]/, "Contains lowercase letter")
			.regex(/\d/, "Contains number")
			.regex(/[!@#$%^&*(),.?":{}|<>]/, "Contains special character"),
		confirmPassword: z.string(),
		role: z.enum(["STUDENT", "TEACHER"]),
		inviteCode: z.string(),
		gradeLevel: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	})
	// The second cross-field rule: a teacher account needs an invite code
	// (#250). It is a `.refine()` rather than a `.min(1)` on the field
	// because the rule depends on `role` -- a student never sees the input,
	// and an empty string must stay valid for them.
	.refine(
		(data) => data.role !== "TEACHER" || data.inviteCode.trim().length > 0,
		{
			message: "Invite code is required for teacher accounts",
			path: ["inviteCode"],
		},
	)
	// #244. A student is asked; a teacher is not, and their empty string must
	// stay valid. Same shape as the invite-code rule above and for the same
	// reason: the requirement depends on role. The API accepts an absent
	// grade -- this rule exists so a student consciously answers.
	.refine((data) => data.role !== "STUDENT" || data.gradeLevel.length > 0, {
		message: "Please choose your grade",
		path: ["gradeLevel"],
	});

export const passwordChangeSchema = z
	.object({
		currentPassword: z.string().min(1, "Current password is required"),
		newPassword: z
			.string()
			.min(8, "At least 8 characters")
			.regex(/[A-Z]/, "Contains uppercase letter")
			.regex(/[a-z]/, "Contains lowercase letter")
			.regex(/\d/, "Contains number")
			.regex(/[!@#$%^&*(),.?":{}|<>]/, "Contains special character"),
		confirmPassword: z.string(),
	})
	.refine((data) => data.newPassword === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
	});

export const deleteAccountSchema = z.object({
	emailConfirmation: z.string().min(1, "Email confirmation is required"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;
export type DeleteAccountFormData = z.infer<typeof deleteAccountSchema>;

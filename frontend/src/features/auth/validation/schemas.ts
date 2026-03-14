import { z } from "zod";

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
		email: z.string().email("Invalid email format"),
		password: z
			.string()
			.min(8, "At least 8 characters")
			.regex(/[A-Z]/, "Contains uppercase letter")
			.regex(/[a-z]/, "Contains lowercase letter")
			.regex(/\d/, "Contains number")
			.regex(/[!@#$%^&*(),.?":{}|<>]/, "Contains special character"),
		confirmPassword: z.string(),
		role: z.enum(["STUDENT", "TEACHER", "PARENT"]),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords do not match",
		path: ["confirmPassword"],
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

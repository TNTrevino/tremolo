/**
 * Password validation utilities
 * Matches backend requirements in backend/main/validations/validations.go
 */

export interface PasswordRequirement {
	id: string;
	label: string;
	test: (password: string) => boolean;
}

/**
 * Array of password requirements matching backend validation
 * Backend: min=8, password_complexity (uppercase, lowercase, number, special char)
 */
export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
	{
		id: "minLength",
		label: "At least 8 characters",
		test: (pwd) => pwd.length >= 8,
	},
	{
		id: "hasUppercase",
		label: "One uppercase letter",
		test: (pwd) => /[A-Z]/.test(pwd),
	},
	{
		id: "hasLowercase",
		label: "One lowercase letter",
		test: (pwd) => /[a-z]/.test(pwd),
	},
	{
		id: "hasNumber",
		label: "One number",
		test: (pwd) => /[0-9]/.test(pwd),
	},
	{
		id: "hasSpecial",
		label: "One special character (!@#$%^&*...)",
		test: (pwd) => /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(pwd),
	},
];

/**
 * Validates password against all requirements
 * @param password - Password string to validate
 * @returns Object with individual requirement results and overall validity
 */
export const validatePasswordRequirements = (password: string) => {
	const requirements = PASSWORD_REQUIREMENTS.reduce(
		(acc, req) => ({
			...acc,
			[req.id]: req.test(password),
		}),
		{} as Record<string, boolean>,
	);

	const isValid = PASSWORD_REQUIREMENTS.every((req) => req.test(password));

	return { requirements, isValid };
};

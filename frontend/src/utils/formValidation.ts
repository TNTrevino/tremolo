export const validateEmail = (
	email: string,
	setError: (error: string) => void,
): boolean => {
	if (!email) {
		setError("Email is required");
		return false;
	}
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		setError("Please enter a valid email address");
		return false;
	}
	setError("");
	return true;
};

export const validateName = (
	name: string,
	fieldName: string,
	setError: (error: string) => void,
): boolean => {
	if (!name.trim()) {
		setError(`${fieldName} is required`);
		return false;
	}
	if (name.trim().length < 2) {
		setError(`${fieldName} must be at least 2 characters`);
		return false;
	}
	setError("");
	return true;
};

export const validateConfirmPassword = (
	confirmPwd: string,
	originalPwd: string,
	setError: (error: string) => void,
): boolean => {
	if (!confirmPwd) {
		setError("Please confirm your password");
		return false;
	}
	if (confirmPwd !== originalPwd) {
		setError("Passwords do not match");
		return false;
	}
	setError("");
	return true;
};

export const calculatePasswordStrength = (pwd: string): number => {
	let strength = 0;
	if (pwd.length >= 8) strength += 20;
	if (pwd.length >= 12) strength += 20;
	if (/[a-z]/.test(pwd)) strength += 15;
	if (/[A-Z]/.test(pwd)) strength += 15;
	if (/\d/.test(pwd)) strength += 15;
	if (/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(pwd)) strength += 15;
	return Math.min(strength, 100);
};

export const getPasswordStrengthColor = (
	strength: number,
): "error" | "warning" | "success" => {
	if (strength < 40) return "error";
	if (strength < 70) return "warning";
	return "success";
};

export const getPasswordStrengthLabel = (strength: number): string => {
	if (strength === 0) return "";
	if (strength < 40) return "Weak";
	if (strength < 70) return "Medium";
	return "Strong";
};

import { useState, useEffect } from "react";
import {
	TextField,
	MenuItem,
	FormControl,
	InputLabel,
	Select,
	SelectChangeEvent,
} from "@mui/material";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { AuthService } from "../services/AuthService";
import { UserRole } from "../models/models";
import PasswordRequirements from "../components/PasswordRequirements";
import { validatePasswordRequirements } from "../utils/passwordValidation";
import { AuthFormContainer } from "../components/auth/AuthFormContainer";
import { AuthCard } from "../components/auth/AuthCard";
import { PasswordField } from "../components/auth/PasswordField";
import { PasswordStrengthMeter } from "../components/auth/PasswordStrengthMeter";
import { AuthFormFooter } from "../components/auth/AuthFormFooter";
import { SubmitButton } from "../components/auth/SubmitButton";
import {
	validateEmail,
	validateName,
	validateConfirmPassword,
	calculatePasswordStrength,
	getPasswordStrengthColor,
	getPasswordStrengthLabel,
} from "../utils/formValidation";

const SignupPage = () => {
	const [firstName, setFirstName] = useState<string>("");
	const [lastName, setLastName] = useState<string>("");
	const [email, setEmail] = useState<string>("");
	const [password, setPassword] = useState<string>("");
	const [confirmPassword, setConfirmPassword] = useState<string>("");
	const [role, setRole] = useState<UserRole>("student");
	const [showPassword, setShowPassword] = useState<boolean>(false);
	const [showConfirmPassword, setShowConfirmPassword] =
		useState<boolean>(false);
	const [passwordTouched, setPasswordTouched] = useState<boolean>(false);

	const [error, setError] = useState<string>("");
	const [firstNameError, setFirstNameError] = useState<string>("");
	const [lastNameError, setLastNameError] = useState<string>("");
	const [emailError, setEmailError] = useState<string>("");
	const [passwordError, setPasswordError] = useState<string>("");
	const [confirmPasswordError, setConfirmPasswordError] = useState<string>("");

	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [successMessage, setSuccessMessage] = useState<string>("");

	const { isAuthenticated } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		if (isAuthenticated) {
			navigate("/dashboard", { replace: true });
		}
	}, [isAuthenticated, navigate]);

	const { isValid: isPasswordValid } = validatePasswordRequirements(password);
	const passwordStrength = calculatePasswordStrength(password);

	const validatePasswordField = (password: string): boolean => {
		if (!password) {
			setPasswordError("Password is required");
			return false;
		}
		if (!isPasswordValid) {
			setPasswordError("Password does not meet all requirements");
			return false;
		}
		setPasswordError("");
		return true;
	};

	const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFirstName(e.target.value);
		if (firstNameError) {
			validateName(e.target.value, "First name", setFirstNameError);
		}
	};

	const handleLastNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setLastName(e.target.value);
		if (lastNameError) {
			validateName(e.target.value, "Last name", setLastNameError);
		}
	};

	const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setEmail(e.target.value);
		if (emailError) {
			validateEmail(e.target.value, setEmailError);
		}
	};

	const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newPassword = e.target.value;
		setPassword(newPassword);
		if (passwordTouched && passwordError) {
			validatePasswordField(newPassword);
		}
		if (confirmPassword) {
			validateConfirmPassword(
				confirmPassword,
				newPassword,
				setConfirmPasswordError,
			);
		}
	};

	const handleConfirmPasswordChange = (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		setConfirmPassword(e.target.value);
		if (confirmPasswordError) {
			validateConfirmPassword(
				e.target.value,
				password,
				setConfirmPasswordError,
			);
		}
	};

	const handleRoleChange = (event: SelectChangeEvent<UserRole>) => {
		setRole(event.target.value as UserRole);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setSuccessMessage("");

		const isFirstNameValid = validateName(
			firstName,
			"First name",
			setFirstNameError,
		);
		const isLastNameValid = validateName(
			lastName,
			"Last name",
			setLastNameError,
		);
		const isEmailValid = validateEmail(email, setEmailError);
		const isPasswordValid = validatePasswordField(password);
		const isConfirmPasswordValid = validateConfirmPassword(
			confirmPassword,
			password,
			setConfirmPasswordError,
		);

		if (
			!isFirstNameValid ||
			!isLastNameValid ||
			!isEmailValid ||
			!isPasswordValid ||
			!isConfirmPasswordValid
		) {
			return;
		}

		setIsLoading(true);

		try {
			await AuthService.register({
				email,
				password,
				first_name: firstName.trim(),
				last_name: lastName.trim(),
				role,
			});

			setSuccessMessage(
				"Account created successfully! Redirecting to login...",
			);

			navigate("/login", {
				state: { message: "Account created! Please log in." },
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Registration failed");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<AuthFormContainer>
			<AuthCard
				title="Create Your Account"
				subtitle="Join Tremolo and start your musical journey"
				error={error}
				successMessage={successMessage}
				onSubmit={handleSubmit}
			>
				<TextField
					fullWidth
					id="firstName"
					label="First Name"
					name="firstName"
					autoComplete="given-name"
					autoFocus
					value={firstName}
					onChange={handleFirstNameChange}
					onBlur={() =>
						validateName(firstName, "First name", setFirstNameError)
					}
					error={!!firstNameError}
					helperText={firstNameError}
					disabled={isLoading}
					required
					sx={{ mb: 2 }}
				/>

				<TextField
					fullWidth
					id="lastName"
					label="Last Name"
					name="lastName"
					autoComplete="family-name"
					value={lastName}
					onChange={handleLastNameChange}
					onBlur={() => validateName(lastName, "Last name", setLastNameError)}
					error={!!lastNameError}
					helperText={lastNameError}
					disabled={isLoading}
					required
					sx={{ mb: 2 }}
				/>

				<TextField
					fullWidth
					id="email"
					label="Email Address"
					name="email"
					type="email"
					autoComplete="email"
					value={email}
					onChange={handleEmailChange}
					onBlur={() => validateEmail(email, setEmailError)}
					error={!!emailError}
					helperText={emailError}
					disabled={isLoading}
					required
					sx={{ mb: 2 }}
				/>

				<PasswordField
					id="password"
					label="Password"
					value={password}
					onChange={handlePasswordChange}
					onBlur={() => {
						setPasswordTouched(true);
						validatePasswordField(password);
					}}
					error={passwordError}
					showPassword={showPassword}
					onToggleVisibility={() => setShowPassword(!showPassword)}
					disabled={isLoading}
					autoComplete="new-password"
					required
					sx={{ mb: 1 }}
				/>

				<PasswordRequirements
					password={password}
					show={passwordTouched || !!password}
				/>

				<PasswordStrengthMeter
					password={password}
					strength={passwordStrength}
					strengthColor={getPasswordStrengthColor(passwordStrength)}
					strengthLabel={getPasswordStrengthLabel(passwordStrength)}
				/>

				<PasswordField
					id="confirmPassword"
					label="Confirm Password"
					value={confirmPassword}
					onChange={handleConfirmPasswordChange}
					onBlur={() =>
						validateConfirmPassword(
							confirmPassword,
							password,
							setConfirmPasswordError,
						)
					}
					error={confirmPasswordError}
					showPassword={showConfirmPassword}
					onToggleVisibility={() =>
						setShowConfirmPassword(!showConfirmPassword)
					}
					disabled={isLoading}
					autoComplete="new-password"
					required
					sx={{ mb: 2 }}
				/>

				<FormControl fullWidth sx={{ mb: 3 }}>
					<InputLabel id="role-label">I am a...</InputLabel>
					<Select
						labelId="role-label"
						id="role"
						value={role}
						label="I am a..."
						onChange={handleRoleChange}
						disabled={isLoading}
					>
						<MenuItem value="student">Student</MenuItem>
						<MenuItem value="teacher">Teacher</MenuItem>
						<MenuItem value="parent">Parent</MenuItem>
					</Select>
				</FormControl>

				<SubmitButton isLoading={isLoading} buttonText="Create Account" />
			</AuthCard>

			<AuthFormFooter
				text="Already have an account?"
				linkText="Login"
				linkTo="/login"
			/>
		</AuthFormContainer>
	);
};

export default SignupPage;

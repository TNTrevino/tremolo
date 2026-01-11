import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthFormContainer } from "../components/auth/AuthFormContainer";
import { AuthCard } from "../components/auth/AuthCard";
import { PasswordField } from "../components/auth/PasswordField";
import { AuthFormFooter } from "../components/auth/AuthFormFooter";
import { SubmitButton } from "../components/auth/SubmitButton";
import { validateEmail } from "../utils/formValidation";
import { TextField } from "@mui/material";

const LoginPage = () => {
	const [email, setEmail] = useState<string>("");
	const [password, setPassword] = useState<string>("");
	const [showPassword, setShowPassword] = useState<boolean>(false);
	const [error, setError] = useState<string>("");
	const [emailError, setEmailError] = useState<string>("");
	const [passwordError, setPasswordError] = useState<string>("");
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [successMessage, setSuccessMessage] = useState<string>("");

	const { login, isAuthenticated } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();

	useEffect(() => {
		if (isAuthenticated) {
			navigate("/dashboard", { replace: true });
		}
	}, [isAuthenticated, navigate]);

	useEffect(() => {
		if (location.state?.message) {
			setSuccessMessage(location.state.message);
			window.history.replaceState({}, document.title);
		}
	}, [location]);

	const validatePassword = (password: string): boolean => {
		if (!password) {
			setPasswordError("Password is required");
			return false;
		}
		setPasswordError("");
		return true;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		setIsLoading(true);

		try {
			await login(email, password);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Login failed");
		} finally {
			setIsLoading(false);
		}
	};

	const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setEmail(e.target.value);
		if (emailError) {
			validateEmail(e.target.value, setEmailError);
		}
	};

	const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setPassword(e.target.value);
		if (passwordError) {
			validatePassword(e.target.value);
		}
	};

	return (
		<AuthFormContainer>
			<AuthCard
				title="Welcome to Tremolo"
				subtitle="Sign in to continue your musical journey"
				error={error}
				successMessage={successMessage}
				onSubmit={handleSubmit}
			>
				<TextField
					fullWidth
					id="email"
					label="Email Address"
					name="email"
					type="email"
					autoComplete="email"
					autoFocus
					value={email}
					onChange={handleEmailChange}
					onBlur={() => validateEmail(email, setEmailError)}
					error={!!emailError}
					helperText={emailError}
					disabled={isLoading}
					sx={{ mb: 2 }}
					required
				/>

				<PasswordField
					id="password"
					label="Password"
					value={password}
					onChange={handlePasswordChange}
					onBlur={() => validatePassword(password)}
					error={passwordError}
					showPassword={showPassword}
					onToggleVisibility={() => setShowPassword(!showPassword)}
					disabled={isLoading}
					autoComplete="current-password"
					required
					sx={{ mb: 3 }}
				/>

				<SubmitButton isLoading={isLoading} buttonText="Sign In" />
			</AuthCard>

			<AuthFormFooter
				text="Don't have an account?"
				linkText="Sign up"
				linkTo="/signup"
			/>
		</AuthFormContainer>
	);
};

export default LoginPage;

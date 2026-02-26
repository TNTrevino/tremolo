import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Music, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { FormField } from "@/shared/components/forms/FormField";
import { FormInput } from "@/shared/components/forms/FormInput";
import { FormSelect } from "@/shared/components/forms/FormSelect";
import {
	signupSchema,
	type SignupFormData,
} from "@/features/auth/validation/schemas";
import { useRegister } from "@/shared/hooks/queries/useAuthQuery";
import { cn } from "@/lib/utils";
import type { PasswordRequirement, LoginLocationState } from "@/shared/types";
import type { ApiError } from "@/services/api/types";
import { logError, getErrorMessage } from "@/shared/utils/error.utils";

export interface SignupPageProps {}

export function SignupPage() {
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [passwordFocused, setPasswordFocused] = useState(false);
	const navigate = useNavigate();
	const registerMutation = useRegister();

	const {
		register,
		handleSubmit,
		watch,
		formState: { errors },
		setError,
	} = useForm<SignupFormData>({
		resolver: zodResolver(signupSchema),
		defaultValues: {
			role: "student",
		},
	});

	// React Hook Form's watch() is intentionally not memoized
	// eslint-disable-next-line react-hooks/incompatible-library
	const password = watch("password", "");

	// Password validation
	const passwordRequirements: PasswordRequirement[] = [
		{ label: "At least 8 characters", met: password.length >= 8 },
		{ label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
		{ label: "Contains lowercase letter", met: /[a-z]/.test(password) },
		{ label: "Contains number", met: /\d/.test(password) },
		{
			label: "Contains special character",
			met: /[!@#$%^&*(),.?":{}|<>]/.test(password),
		},
	];

	// Password strength
	const getPasswordStrength = () => {
		const metCount = passwordRequirements.filter((req) => req.met).length;
		if (metCount === 0) return { label: "", color: "", width: "0%" };
		if (metCount <= 2)
			return { label: "Weak", color: "bg-destructive", width: "25%" };
		if (metCount === 3)
			return { label: "Fair", color: "bg-orange-500", width: "50%" };
		if (metCount === 4)
			return { label: "Good", color: "bg-yellow-500", width: "75%" };
		return { label: "Strong", color: "bg-green-500", width: "100%" };
	};

	const passwordStrength = getPasswordStrength();

	const onSubmit = async (data: SignupFormData) => {
		try {
			// Map form data to API format
			await registerMutation.mutateAsync({
				email: data.email,
				password: data.password,
				first_name: data.firstName,
				last_name: data.lastName,
				role: data.role,
			});

			const navState: LoginLocationState = {
				successMessage: "Account created! Please log in.",
			};
			navigate("/login", { state: navState });
		} catch (err) {
			logError(err, "SignupPage.onSubmit");
			const apiError = err as ApiError;
			setError("root", {
				message: apiError.message || getErrorMessage(err),
			});
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center py-12 px-4">
			<Card className="w-full max-w-md shadow-lg">
				<CardHeader className="space-y-1 text-center">
					<div className="flex justify-center mb-4">
						<div className="rounded-lg bg-primary p-3">
							<Music className="h-8 w-8 text-primary-foreground" />
						</div>
					</div>
					<CardTitle className="text-3xl font-bold">
						Create Your Account
					</CardTitle>
					<CardDescription className="text-base">
						Join Tremolo and start your musical journey
					</CardDescription>
				</CardHeader>

				<form onSubmit={handleSubmit(onSubmit)}>
					<CardContent className="space-y-4">
						{errors.root && (
							<div className="p-3 rounded-md bg-destructive/10 border-2 border-destructive text-destructive text-sm font-medium">
								{errors.root.message}
							</div>
						)}

						<div className="grid grid-cols-2 gap-4">
							<FormField
								label="First Name"
								error={errors.firstName?.message}
								htmlFor="firstName"
							>
								<FormInput
									id="firstName"
									placeholder="John"
									autoComplete="given-name"
									{...register("firstName")}
									error={errors.firstName?.message}
								/>
							</FormField>

							<FormField
								label="Last Name"
								error={errors.lastName?.message}
								htmlFor="lastName"
							>
								<FormInput
									id="lastName"
									placeholder="Doe"
									autoComplete="family-name"
									{...register("lastName")}
									error={errors.lastName?.message}
								/>
							</FormField>
						</div>

						<FormField
							label="Email Address"
							error={errors.email?.message}
							htmlFor="email"
						>
							<FormInput
								id="email"
								type="email"
								placeholder="you@example.com"
								autoComplete="email"
								{...register("email")}
								error={errors.email?.message}
							/>
						</FormField>

						<FormField
							label="Password"
							error={errors.password?.message}
							htmlFor="password"
						>
							<div className="relative">
								<FormInput
									id="password"
									type={showPassword ? "text" : "password"}
									placeholder="••••••••"
									autoComplete="new-password"
									className="pr-10"
									{...register("password")}
									error={errors.password?.message}
									onFocus={() => setPasswordFocused(true)}
									onBlur={() => setPasswordFocused(false)}
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
								>
									{showPassword ? (
										<EyeOff className="h-4 w-4" />
									) : (
										<Eye className="h-4 w-4" />
									)}
								</button>
							</div>

							{(passwordFocused || password) && (
								<div className="space-y-2 p-3 rounded-md bg-muted/50 border border-border">
									<p className="text-xs font-medium">Password Requirements:</p>
									<div className="space-y-1">
										{passwordRequirements.map((req, index) => (
											<div
												key={index}
												className="flex items-center gap-2 text-xs"
											>
												{req.met ? (
													<Check className="h-3 w-3 text-green-500" />
												) : (
													<X className="h-3 w-3 text-muted-foreground" />
												)}
												<span className={cn(req.met && "text-green-500")}>
													{req.label}
												</span>
											</div>
										))}
									</div>

									{password && (
										<div className="space-y-1 pt-2">
											<div className="flex justify-between text-xs">
												<span>Strength:</span>
												<span
													className={cn(
														"font-medium",
														passwordStrength.color.replace("bg-", "text-"),
													)}
												>
													{passwordStrength.label}
												</span>
											</div>
											<div className="h-2 bg-muted rounded-full overflow-hidden">
												<div
													className={cn(
														"h-full transition-all",
														passwordStrength.color,
													)}
													style={{ width: passwordStrength.width }}
												/>
											</div>
										</div>
									)}
								</div>
							)}
						</FormField>

						<FormField
							label="Confirm Password"
							error={errors.confirmPassword?.message}
							htmlFor="confirmPassword"
						>
							<div className="relative">
								<FormInput
									id="confirmPassword"
									type={showConfirmPassword ? "text" : "password"}
									placeholder="••••••••"
									autoComplete="new-password"
									className="pr-10"
									{...register("confirmPassword")}
									error={errors.confirmPassword?.message}
								/>
								<button
									type="button"
									onClick={() => setShowConfirmPassword(!showConfirmPassword)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
								>
									{showConfirmPassword ? (
										<EyeOff className="h-4 w-4" />
									) : (
										<Eye className="h-4 w-4" />
									)}
								</button>
							</div>
						</FormField>

						<FormField
							label="I am a..."
							error={errors.role?.message}
							htmlFor="role"
						>
							<FormSelect
								id="role"
								{...register("role")}
								error={errors.role?.message}
							>
								<option value="student">Student</option>
								<option value="teacher">Teacher</option>
								<option value="parent">Parent</option>
							</FormSelect>
						</FormField>
					</CardContent>

					<CardFooter className="flex flex-col space-y-4">
						<Button
							type="submit"
							className="w-full"
							size="lg"
							loading={registerMutation.isPending}
						>
							Create Account
						</Button>

						<p className="text-sm text-center text-muted-foreground">
							Already have an account?{" "}
							<Link
								to="/login"
								className="text-primary font-medium hover:underline"
							>
								Login
							</Link>
						</p>
					</CardFooter>
				</form>
			</Card>
		</div>
	);
}

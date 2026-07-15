import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "@/stores/auth.store";
import { useLogout } from "@/shared/hooks/queries/useAuthQuery";
import { useNavigate } from "react-router-dom";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { FormField } from "@/shared/components/forms/FormField";
import { FormInput } from "@/shared/components/forms/FormInput";
import {
	Shield,
	Mail,
	Key,
	Download,
	Trash2,
	Eye,
	EyeOff,
	AlertTriangle,
} from "lucide-react";
import {
	passwordChangeSchema,
	deleteAccountSchema,
	type PasswordChangeFormData,
	type DeleteAccountFormData,
} from "@/features/auth/validation/schemas";
import { useToast } from "@/shared/hooks/useToast";

export function AccountPage() {
	const { user } = useAuthStore();
	const navigate = useNavigate();
	const logoutMutation = useLogout();
	const { showSuccess, showInfo, showError } = useToast();

	const [showPasswords, setShowPasswords] = useState(false);
	const [showDeleteModal, setShowDeleteModal] = useState(false);

	const {
		register: registerPassword,
		handleSubmit: handlePasswordSubmit,
		formState: { errors: passwordErrors },
		reset: resetPasswordForm,
	} = useForm<PasswordChangeFormData>({
		resolver: zodResolver(passwordChangeSchema),
	});

	const {
		register: registerDelete,
		handleSubmit: handleDeleteSubmit,
		formState: { errors: deleteErrors },
		reset: resetDeleteForm,
	} = useForm<DeleteAccountFormData>({
		resolver: zodResolver(deleteAccountSchema),
	});

	if (!user) return null;

	const onPasswordSubmit = (_data: PasswordChangeFormData) => {
		showInfo("Password update functionality coming soon!");
		resetPasswordForm();
	};

	const handleDownloadData = () => {
		showInfo("Your data download will begin shortly. (Feature coming soon)");
	};

	const onDeleteSubmit = (data: DeleteAccountFormData) => {
		if (data.emailConfirmation === user.email) {
			showSuccess("Account deletion would occur here");
			logoutMutation.mutate(undefined, {
				onSuccess: () => navigate("/"),
			});
		} else {
			showError("Email does not match your account email");
		}
	};

	return (
		<div className="min-h-screen py-8 px-4">
			<div className="container mx-auto max-w-4xl space-y-6">
				<div className="text-center space-y-2">
					<h1 className="text-4xl font-bold">Account Settings</h1>
					<p className="text-muted-foreground text-lg">
						Manage your security, privacy, and account preferences
					</p>
				</div>

				<Card className="shadow-lg">
					<CardHeader>
						<div className="flex items-center gap-3">
							<div className="rounded-lg bg-primary/10 p-2">
								<Shield className="h-6 w-6 text-primary" />
							</div>
							<div>
								<CardTitle>Account Security</CardTitle>
								<CardDescription>
									Manage your password and authentication
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<form
							onSubmit={handlePasswordSubmit(onPasswordSubmit)}
							className="space-y-4"
						>
							{passwordErrors.root && (
								<div className="p-3 rounded-md bg-destructive/10 border-2 border-destructive text-destructive text-sm font-medium">
									{passwordErrors.root.message}
								</div>
							)}

							<FormField
								label="Current Password"
								error={passwordErrors.currentPassword?.message}
								htmlFor="currentPassword"
							>
								<div className="relative">
									<FormInput
										id="currentPassword"
										type={showPasswords ? "text" : "password"}
										placeholder="Enter current password"
										autoComplete="current-password"
										className="pr-10"
										{...registerPassword("currentPassword")}
										error={passwordErrors.currentPassword?.message}
									/>
									<button
										type="button"
										onClick={() => setShowPasswords(!showPasswords)}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
									>
										{showPasswords ? (
											<EyeOff className="h-4 w-4" />
										) : (
											<Eye className="h-4 w-4" />
										)}
									</button>
								</div>
							</FormField>

							<FormField
								label="New Password"
								error={passwordErrors.newPassword?.message}
								htmlFor="newPassword"
							>
								<FormInput
									id="newPassword"
									type={showPasswords ? "text" : "password"}
									placeholder="Enter new password"
									autoComplete="new-password"
									{...registerPassword("newPassword")}
									error={passwordErrors.newPassword?.message}
								/>
							</FormField>

							<FormField
								label="Confirm New Password"
								error={passwordErrors.confirmPassword?.message}
								htmlFor="confirmPassword"
							>
								<FormInput
									id="confirmPassword"
									type={showPasswords ? "text" : "password"}
									placeholder="Confirm new password"
									autoComplete="new-password"
									{...registerPassword("confirmPassword")}
									error={passwordErrors.confirmPassword?.message}
								/>
							</FormField>

							<Button type="submit">
								<Key className="mr-2 h-4 w-4" />
								Update Password
							</Button>
						</form>
					</CardContent>
				</Card>

				<Card className="shadow-lg">
					<CardHeader>
						<div className="flex items-center gap-3">
							<div className="rounded-lg bg-brass/10 p-2">
								<Mail className="h-6 w-6 text-brass" />
							</div>
							<div>
								<CardTitle>Email Management</CardTitle>
								<CardDescription>Update your email address</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<p className="text-sm font-medium">Current Email</p>
							<div className="text-lg font-medium">{user.email}</div>
						</div>
						<p className="text-sm text-muted-foreground">
							Email change functionality coming soon. You&apos;ll be able to
							update your email address and verify the new address before the
							change takes effect.
						</p>
					</CardContent>
				</Card>

				<Card className="shadow-lg">
					<CardHeader>
						<div className="flex items-center gap-3">
							<div className="rounded-lg bg-primary/10 p-2">
								<Shield className="h-6 w-6 text-primary" />
							</div>
							<div>
								<CardTitle>Privacy Settings</CardTitle>
								<CardDescription>Control your data visibility</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						<p className="text-sm text-muted-foreground">
							Privacy controls will allow you to manage:
						</p>
						<ul className="space-y-2 text-sm text-muted-foreground">
							<li>• Teacher access to your performance data</li>
							<li>• Parent visibility of practice sessions</li>
							<li>• Inclusion in class leaderboards</li>
							<li>• Email notification preferences</li>
						</ul>
					</CardContent>
				</Card>

				<Card className="shadow-lg">
					<CardHeader>
						<div className="flex items-center gap-3">
							<div className="rounded-lg bg-brass/10 p-2">
								<Download className="h-6 w-6 text-brass" />
							</div>
							<div>
								<CardTitle>Data & Privacy</CardTitle>
								<CardDescription>Download or delete your data</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<h4 className="font-medium mb-2">Download Your Data</h4>
							<p className="text-sm text-muted-foreground mb-4">
								Get a copy of all your practice data, statistics, and account
								information in JSON format.
							</p>
							<Button variant="outline" onClick={handleDownloadData}>
								<Download className="mr-2 h-4 w-4" />
								Download All My Data
							</Button>
						</div>
					</CardContent>
				</Card>

				<Card className="shadow-lg border-destructive/50">
					<CardHeader>
						<div className="flex items-center gap-3">
							<div className="rounded-lg bg-destructive/10 p-2">
								<AlertTriangle className="h-6 w-6 text-destructive" />
							</div>
							<div>
								<CardTitle className="text-destructive">Danger Zone</CardTitle>
								<CardDescription>Irreversible account actions</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<h4 className="font-medium mb-2">Delete Account</h4>
							<p className="text-sm text-muted-foreground mb-4">
								Once you delete your account, there is no going back. All your
								data will be permanently removed.
							</p>
							<Button
								variant="destructive"
								onClick={() => setShowDeleteModal(true)}
							>
								<Trash2 className="mr-2 h-4 w-4" />
								Delete My Account
							</Button>
						</div>
					</CardContent>
				</Card>

				{showDeleteModal && (
					<div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
						<Card className="w-full max-w-md shadow-2xl border-destructive">
							<CardHeader>
								<CardTitle className="text-destructive">
									Confirm Account Deletion
								</CardTitle>
								<CardDescription>This action cannot be undone</CardDescription>
							</CardHeader>
							<CardContent>
								<form
									onSubmit={handleDeleteSubmit(onDeleteSubmit)}
									className="space-y-4"
								>
									<p className="text-sm">
										All your practice data, statistics, and account information
										will be permanently deleted. Type your email address to
										confirm:
									</p>
									<FormField
										error={deleteErrors.emailConfirmation?.message}
										htmlFor="emailConfirmation"
									>
										<FormInput
											id="emailConfirmation"
											type="email"
											placeholder={user.email}
											{...registerDelete("emailConfirmation")}
											error={deleteErrors.emailConfirmation?.message}
										/>
									</FormField>
									<div className="flex gap-2">
										<Button
											type="button"
											variant="outline"
											onClick={() => {
												setShowDeleteModal(false);
												resetDeleteForm();
											}}
											className="flex-1"
										>
											Cancel
										</Button>
										<Button
											type="submit"
											variant="destructive"
											className="flex-1"
										>
											Permanently Delete Account
										</Button>
									</div>
								</form>
							</CardContent>
						</Card>
					</div>
				)}
			</div>
		</div>
	);
}

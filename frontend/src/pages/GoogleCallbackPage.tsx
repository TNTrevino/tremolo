import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useGoogleCallback } from "@/shared/hooks/queries/useAuthQuery";
import {
	verifyOAuthState,
	getRedirectUri,
} from "@/features/auth/services/google-oauth";
import type { LoginLocationState } from "@/shared/types";
import { getErrorMessage } from "@/shared/utils/error.utils";

export function GoogleCallbackPage() {
	const navigate = useNavigate();
	const googleCallback = useGoogleCallback();
	const startedRef = useRef(false);

	useEffect(() => {
		if (startedRef.current) return;
		startedRef.current = true;

		const params = new URLSearchParams(window.location.search);
		const code = params.get("code");
		const state = params.get("state");

		const errorParam = params.get("error");
		if (errorParam) {
			const message =
				errorParam === "access_denied"
					? "Google sign-in was cancelled."
					: "Google sign-in failed. Please try again.";
			navigate("/login", {
				state: { errorMessage: message } satisfies LoginLocationState,
				replace: true,
			});
			return;
		}

		if (!code || !state) {
			navigate("/login", {
				state: {
					errorMessage: "OAuth callback missing required parameters.",
				} satisfies LoginLocationState,
				replace: true,
			});
			return;
		}

		if (!verifyOAuthState(state)) {
			navigate("/login", {
				state: {
					errorMessage: "OAuth state verification failed. Please try again.",
				} satisfies LoginLocationState,
				replace: true,
			});
			return;
		}

		googleCallback.mutate({ code, redirect_uri: getRedirectUri() });
	}, [googleCallback, navigate]);

	useEffect(() => {
		if (!googleCallback.isError) return;
		navigate("/login", {
			state: {
				errorMessage: getErrorMessage(googleCallback.error),
			} satisfies LoginLocationState,
			replace: true,
		});
	}, [googleCallback.isError, googleCallback.error, navigate]);

	return (
		<div className="min-h-screen flex items-center justify-center">
			<div className="text-center space-y-4">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
				<p className="text-muted-foreground">Signing in with Google...</p>
			</div>
		</div>
	);
}

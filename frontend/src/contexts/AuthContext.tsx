import React, { useState, useEffect } from "react";
import { User } from "../models/models";
import { AuthService } from "../services/AuthService";
import { AuthContext, AuthContextType } from "./AuthContextDefinition";

interface AuthProviderProps {
	children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
	const [currentUser, setCurrentUser] = useState<User | null>(null);
	const [loading, setLoading] = useState<boolean>(true);

	// Check for existing token and fetch user data on mount
	useEffect(() => {
		const initAuth = async () => {
			if (AuthService.isAuthenticated()) {
				try {
					const user = await AuthService.getCurrentUser();
					setCurrentUser(user);
				} catch (error) {
					console.error("Failed to fetch user on mount:", error);
					// Token is invalid, clear it
					AuthService.logout();
					setCurrentUser(null);
				}
			}
			setLoading(false);
		};

		initAuth();
	}, []);

	const login = async (email: string, password: string): Promise<void> => {
		setLoading(true);
		try {
			const response = await AuthService.login(email, password);
			setCurrentUser(response.user);
		} catch (error) {
			setCurrentUser(null);
			throw error;
		} finally {
			setLoading(false);
		}
	};

	const logout = (): void => {
		AuthService.logout();
		setCurrentUser(null);
	};

	const refreshUser = async (): Promise<void> => {
		if (AuthService.isAuthenticated()) {
			try {
				const user = await AuthService.getCurrentUser();
				setCurrentUser(user);
			} catch (error) {
				console.error("Failed to refresh user:", error);
				logout();
			}
		}
	};

	const auth: AuthContextType = {
		currentUser,
		isAuthenticated: !!currentUser,
		loading,
		login,
		logout,
		refreshUser,
	};

	return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

import { createContext } from "react";
import { User } from "../models/models";

export interface AuthContextType {
	currentUser: User | null;
	isAuthenticated: boolean;
	loading: boolean;
	login: (email: string, password: string) => Promise<void>;
	logout: () => void;
	refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
	undefined,
);

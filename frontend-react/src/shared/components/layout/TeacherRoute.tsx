import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth.store";
import { ProtectedRoute } from "./ProtectedRoute";
import type { ReactNode } from "react";

interface TeacherRouteProps {
	children: ReactNode;
}

export function TeacherRoute({ children }: TeacherRouteProps) {
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
	const role = useAuthStore((state) => state.user?.role);

	// Only gate on role once authenticated — an unauthenticated visitor
	// falls through to ProtectedRoute, which sends them to /login instead.
	if (isAuthenticated && role !== "TEACHER") {
		return <Navigate to="/dashboard" replace />;
	}

	return <ProtectedRoute>{children}</ProtectedRoute>;
}

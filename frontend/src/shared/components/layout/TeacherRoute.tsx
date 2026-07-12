import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/auth.store";
import type { ReactNode } from "react";

interface TeacherRouteProps {
	children: ReactNode;
}

export function TeacherRoute({ children }: TeacherRouteProps) {
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
	const role = useAuthStore((state) => state.user?.role);
	const location = useLocation();

	if (!isAuthenticated) {
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	if (role !== "TEACHER") {
		return <Navigate to="/dashboard" replace />;
	}

	return <>{children}</>;
}

import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Box, CircularProgress, Typography } from "@mui/material";

interface ProtectedRouteProps {
	children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
	const { isAuthenticated, loading } = useAuth();

	if (loading) {
		return (
			<Box
				sx={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					minHeight: "60vh",
					gap: 2,
				}}
			>
				<CircularProgress size={60} />
				<Typography variant="body1" color="text.secondary">
					Loading...
				</Typography>
			</Box>
		);
	}

	if (!isAuthenticated) {
		return <Navigate to="/login" replace />;
	}

	return <>{children}</>;
};

export default ProtectedRoute;

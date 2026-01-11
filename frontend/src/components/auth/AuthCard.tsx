import { Card, CardContent, Typography, Alert, Box } from "@mui/material";
import { authPageStyles } from "../../styles";

interface AuthCardProps {
	title: string;
	subtitle: string;
	error?: string;
	successMessage?: string;
	children: React.ReactNode;
	onSubmit?: (e: React.FormEvent) => void;
}

export const AuthCard = ({
	title,
	subtitle,
	error,
	successMessage,
	children,
	onSubmit,
}: AuthCardProps) => {
	return (
		<Card sx={authPageStyles.card}>
			<CardContent sx={authPageStyles.cardContent}>
				<Typography variant="h4" component="h1" sx={authPageStyles.title}>
					{title}
				</Typography>
				<Typography
					variant="body2"
					color="text.secondary"
					sx={authPageStyles.subtitle}
				>
					{subtitle}
				</Typography>

				{successMessage && (
					<Alert severity="success" sx={{ mb: 2 }}>
						{successMessage}
					</Alert>
				)}

				{error && (
					<Alert severity="error" sx={{ mb: 2 }}>
						{error}
					</Alert>
				)}

				<Box component="form" onSubmit={onSubmit} noValidate>
					{children}
				</Box>
			</CardContent>
		</Card>
	);
};

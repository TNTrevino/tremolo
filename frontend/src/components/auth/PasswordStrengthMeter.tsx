import { Box, Typography, LinearProgress } from "@mui/material";
import { authPageStyles } from "../../styles";

interface PasswordStrengthMeterProps {
	password: string;
	strength: number;
	strengthColor: "error" | "warning" | "success";
	strengthLabel: string;
}

export const PasswordStrengthMeter = ({
	password,
	strength,
	strengthColor,
	strengthLabel,
}: PasswordStrengthMeterProps) => {
	if (!password) return null;

	return (
		<Box sx={authPageStyles.passwordStrengthContainer}>
			<Box sx={authPageStyles.passwordStrengthHeader}>
				<Typography variant="caption" color="text.secondary">
					Password Strength
				</Typography>
				<Typography variant="caption" color={`${strengthColor}.main`}>
					{strengthLabel}
				</Typography>
			</Box>
			<LinearProgress
				variant="determinate"
				value={strength}
				color={strengthColor}
				sx={authPageStyles.passwordStrengthBar}
			/>
		</Box>
	);
};

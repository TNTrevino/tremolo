import { Box, Typography } from "@mui/material";
import { userInfoStyles } from "../../styles";

interface UserStatMetricProps {
	label: string;
	value: string | number;
	size?: "small" | "large";
}

export const UserStatMetric = ({
	label,
	value,
	size = "large",
}: UserStatMetricProps) => {
	return (
		<Box sx={userInfoStyles.statMetricContainer}>
			<Typography variant="caption" sx={userInfoStyles.statLabel}>
				{label}
			</Typography>
			<Typography
				variant="h4"
				sx={
					size === "large"
						? userInfoStyles.statValueLarge
						: userInfoStyles.statValueSmall
				}
			>
				{value}
			</Typography>
		</Box>
	);
};

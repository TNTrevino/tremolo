import { Paper, Alert } from "@mui/material";
import { userInfoStyles } from "../../styles";

export const UserInfoEmptyState = () => {
	return (
		<Paper sx={userInfoStyles.cardContainer}>
			<Alert severity="info">No user information available</Alert>
		</Paper>
	);
};

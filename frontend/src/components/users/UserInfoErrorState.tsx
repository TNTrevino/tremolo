import { Paper, Alert } from "@mui/material";
import { userInfoStyles } from "../../styles";

interface UserInfoErrorStateProps {
	error: string;
}

export const UserInfoErrorState = ({ error }: UserInfoErrorStateProps) => {
	return (
		<Paper sx={userInfoStyles.cardContainer}>
			<Alert severity="error">{error}</Alert>
		</Paper>
	);
};

import { Button, CircularProgress } from "@mui/material";
import { authPageStyles } from "../../styles";

interface SubmitButtonProps {
	isLoading: boolean;
	buttonText: string;
	disabled?: boolean;
}

export const SubmitButton = ({
	isLoading,
	buttonText,
	disabled = false,
}: SubmitButtonProps) => {
	return (
		<Button
			type="submit"
			fullWidth
			variant="contained"
			size="large"
			disabled={isLoading || disabled}
			sx={authPageStyles.submitButton}
		>
			{isLoading ? <CircularProgress size={24} color="inherit" /> : buttonText}
		</Button>
	);
};

import { Container, Box, Fade } from "@mui/material";
import { authPageStyles } from "../../styles";

interface AuthFormContainerProps {
	children: React.ReactNode;
}

export const AuthFormContainer = ({ children }: AuthFormContainerProps) => {
	return (
		<Fade in={true} timeout={500}>
			<Container maxWidth="sm">
				<Box sx={authPageStyles.container}>{children}</Box>
			</Container>
		</Fade>
	);
};

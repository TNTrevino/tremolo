import { Typography, Link as MuiLink } from "@mui/material";
import { Link } from "react-router-dom";
import { authPageStyles } from "../../styles";

interface AuthFormFooterProps {
	text: string;
	linkText: string;
	linkTo: string;
}

export const AuthFormFooter = ({
	text,
	linkText,
	linkTo,
}: AuthFormFooterProps) => {
	return (
		<Typography
			variant="body2"
			color="text.secondary"
			sx={authPageStyles.footerText}
		>
			{text}{" "}
			<MuiLink component={Link} to={linkTo} sx={authPageStyles.footerLink}>
				{linkText}
			</MuiLink>
		</Typography>
	);
};

import React from "react";
import {
	Box,
	Typography,
	List,
	ListItem,
	ListItemIcon,
	ListItemText,
} from "@mui/material";
import { CheckCircle, Cancel } from "@mui/icons-material";
import { PASSWORD_REQUIREMENTS } from "../utils/passwordValidation";

interface PasswordRequirementsProps {
	password: string;
	show?: boolean;
}

/**
 * PasswordRequirements component displays a checklist of password requirements
 * with real-time validation feedback using checkmarks and X marks.
 *
 * @param password - Current password value
 * @param show - Whether to show the requirements list (default: true)
 */
const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({
	password,
	show = true,
}) => {
	if (!show) return null;

	return (
		<Box sx={{ mb: 2, mt: 1 }}>
			<Typography
				variant="caption"
				color="text.secondary"
				sx={{ fontWeight: 600, mb: 1, display: "block" }}
			>
				Password Requirements:
			</Typography>
			<List dense sx={{ py: 0 }}>
				{PASSWORD_REQUIREMENTS.map((requirement) => {
					const isMet = requirement.test(password);
					return (
						<ListItem key={requirement.id} sx={{ py: 0.25, px: 0 }}>
							<ListItemIcon sx={{ minWidth: 32 }}>
								{isMet ? (
									<CheckCircle sx={{ fontSize: 18 }} color="success" />
								) : (
									<Cancel sx={{ fontSize: 18 }} color="error" />
								)}
							</ListItemIcon>
							<ListItemText
								primary={requirement.label}
								primaryTypographyProps={{
									variant: "caption",
									color: isMet ? "success.main" : "text.secondary",
								}}
							/>
						</ListItem>
					);
				})}
			</List>
		</Box>
	);
};

export default PasswordRequirements;

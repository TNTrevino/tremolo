import { Box, Typography, Chip, Avatar } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import { userInfoStyles } from "../../styles";

type RoleColor =
	| "primary"
	| "secondary"
	| "success"
	| "error"
	| "info"
	| "warning";

interface UserProfileHeaderProps {
	firstName: string;
	lastName: string;
	joinedDate: string;
	role?: string;
}

const getUserInitials = (firstName: string, lastName: string): string => {
	return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

const formatJoinedDate = (dateString: string): string => {
	const date = new Date(dateString);
	const day = date.getDate();
	const month = date.toLocaleDateString("en-US", { month: "short" });
	const year = date.getFullYear();
	return `Joined ${day} ${month} ${year}`;
};

const getRoleColor = (role: string): RoleColor => {
	switch (role) {
		case "teacher":
			return "primary";
		case "student":
			return "success";
		case "parent":
			return "info";
		default:
			return "secondary";
	}
};

export const UserProfileHeader = ({
	firstName,
	lastName,
	joinedDate,
	role,
}: UserProfileHeaderProps) => {
	return (
		<Box sx={userInfoStyles.profileSection}>
			<Avatar sx={userInfoStyles.avatar}>
				{firstName && lastName ? (
					getUserInitials(firstName, lastName)
				) : (
					<PersonIcon />
				)}
			</Avatar>

			<Box>
				<Box sx={userInfoStyles.nameRoleContainer}>
					<Typography variant="h5" sx={userInfoStyles.userName}>
						{firstName} {lastName}
					</Typography>
					{role && (
						<Chip
							label={role}
							color={getRoleColor(role)}
							size="small"
							sx={userInfoStyles.roleChipDesktop}
						/>
					)}
				</Box>
				<Typography variant="body2" sx={userInfoStyles.joinedDate}>
					{formatJoinedDate(joinedDate)}
				</Typography>
				{role && (
					<Chip
						label={role}
						color={getRoleColor(role)}
						size="small"
						sx={userInfoStyles.roleChipMobile}
					/>
				)}
			</Box>
		</Box>
	);
};

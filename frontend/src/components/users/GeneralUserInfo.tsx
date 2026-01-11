import { useEffect, useState } from "react";
import { Box, Paper, Divider } from "@mui/material";
import { UserInfoService } from "../../services/UserInfoService";
import { GeneralUserInfo as GeneralUserInfoType } from "../../DTOs/user";
import { useAuth } from "../../hooks/useAuth";
import { UserInfoLoadingSkeleton } from "./UserInfoLoadingSkeleton";
import { UserInfoErrorState } from "./UserInfoErrorState";
import { UserInfoEmptyState } from "./UserInfoEmptyState";
import { UserProfileHeader } from "./UserProfileHeader";
import { UserStatMetric } from "./UserStatMetric";
import { userInfoStyles } from "../../styles";

interface GeneralUserInfoProps {
	userId: number;
	onLogout?: () => void;
}

export const GeneralUserInfo = ({ userId }: GeneralUserInfoProps) => {
	const { currentUser } = useAuth();
	const [userInfo, setUserInfo] = useState<GeneralUserInfoType | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchUserInfo = async () => {
			setLoading(true);
			setError(null);

			try {
				const data = await UserInfoService.getGeneralUserInfo(userId);
				setUserInfo(data);
			} catch (err) {
				setError(
					err instanceof Error
						? err.message
						: "Failed to load user information",
				);
			} finally {
				setLoading(false);
			}
		};

		fetchUserInfo();
	}, [userId]);
	if (loading) return <UserInfoLoadingSkeleton />;
	if (error) return <UserInfoErrorState error={error} />;
	if (!userInfo) return <UserInfoEmptyState />;

	return (
		<Paper sx={userInfoStyles.cardContainer}>
			<Box sx={userInfoStyles.mainLayout}>
				<UserProfileHeader
					firstName={userInfo.first_name}
					lastName={userInfo.last_name}
					joinedDate={userInfo.created_date}
					role={currentUser?.role}
				/>
				<Box sx={userInfoStyles.statsActionsContainer}>
					<Box sx={userInfoStyles.statsContainer}>
						<UserStatMetric
							label="total sessions"
							value={userInfo.total_entries}
							size="large"
						/>
						<Divider
							orientation="vertical"
							flexItem
							sx={userInfoStyles.statDivider}
						/>
						<UserStatMetric
							label="time reading"
							value={userInfo.total_duration}
							size="small"
						/>
					</Box>
				</Box>
			</Box>
		</Paper>
	);
};

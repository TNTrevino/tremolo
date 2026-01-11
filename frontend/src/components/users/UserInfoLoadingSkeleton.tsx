import { Box, Paper, Skeleton } from "@mui/material";
import { userInfoStyles } from "../../styles";

export const UserInfoLoadingSkeleton = () => {
	return (
		<Paper sx={userInfoStyles.cardContainer}>
			<Box sx={userInfoStyles.mainLayout}>
				<Box sx={userInfoStyles.profileSection}>
					<Skeleton variant="circular" sx={userInfoStyles.avatar} />
					<Box>
						<Skeleton variant="text" width={200} height={32} />
						<Skeleton variant="text" width={150} height={24} sx={{ mt: 0.5 }} />
					</Box>
				</Box>

				<Box sx={userInfoStyles.statsActionsContainer}>
					<Box sx={userInfoStyles.statsContainer}>
						<Box sx={userInfoStyles.statMetricContainer}>
							<Skeleton variant="text" width={80} height={20} />
							<Skeleton variant="text" width={60} height={40} />
						</Box>
						<Box sx={userInfoStyles.statMetricContainer}>
							<Skeleton variant="text" width={80} height={20} />
							<Skeleton variant="text" width={80} height={40} />
						</Box>
					</Box>
					<Skeleton
						variant="rectangular"
						sx={{ ...userInfoStyles.logoutButton, borderRadius: 1 }}
					/>
				</Box>
			</Box>
		</Paper>
	);
};

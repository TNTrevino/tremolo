import { Box, Fade, SxProps, Typography, Container } from "@mui/material";
import { PerformanceChart } from "../../components/charts/PerformanceChart";
import { GeneralUserInfo } from "../../components/users/GeneralUserInfo";
import { useAuth } from "../../hooks/useAuth";

const mainDiv: SxProps = {
	display: "flex",
	flexDirection: "column",
	p: { xs: "0.5rem", sm: "1rem", md: "2rem" },
};

const Dashboard = () => {
	const { currentUser } = useAuth();

	return (
		<Fade in={true}>
			<Container maxWidth="xl">
				<Box sx={mainDiv}>
					{currentUser && <GeneralUserInfo userId={currentUser.id} />}
					<Box sx={{ mb: 3 }}>
						<PerformanceChart />
					</Box>

					{currentUser && currentUser.role === "teacher" && (
						<Box sx={{ mb: 3 }}>
							<Typography variant="h6" sx={{ mb: 1 }}>
								Teacher Dashboard
							</Typography>
							<Typography variant="body1" color="text.secondary">
								Name: {currentUser.first_name} {currentUser.last_name} | Number
								of students: Coming soon
							</Typography>
						</Box>
					)}
				</Box>
			</Container>
		</Fade>
	);
};

export default Dashboard;

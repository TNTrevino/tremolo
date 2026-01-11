import { SxProps } from "@mui/system";

const noteGameStyles: Record<string, SxProps> = {
	// start desktop
	scoreboardContainer: {
		mb: "2rem",
		display: "flex",
		flexDirection: "column",
		justifyContent: "space-evenly",
		gap: 3,
		padding: "3rem",
	},

	scoreboardItems: {
		display: "flex",
		flexDirection: "column",
		justifyContent: "center",
		padding: "1rem",
	},

	mainDiv: {
		display: "flex",
		flexDirection: "row",
		justifyContent: "space-evenly",
		alignItems: "center",
		width: "100%",
		gap: "2rem",
		px: { xs: "1rem", md: "2rem" },
		mb: "2rem",
	},

	musicContainer: {
		display: "flex",
		width: { xs: "100%", md: "60%" },
		maxWidth: "600px",
		minHeight: { xs: "300px", md: "400px" },
		alignItems: "center",
		justifyContent: "center",
		borderRadius: "10px",
	},

	musicDisplay: {
		width: { xs: "90%", md: "100%" },
		height: { xs: "15rem", md: "20rem" },
		justifyItems: "center",
		alignItems: "center",
	},

	optionButtonsCard: {
		flex: "1",
		display: "flex",
		flexDirection: "column",
		height: "20rem",
		justifyContent: "center",
		alignItems: "center",
		borderRadius: "10px",
	},

	optionButtonsContainer: {
		display: "flex",
		flexDirection: "column",
	},

	answerButtons: {
		m: "1rem",
		textTransform: "none",
		width: { xs: "100%", sm: "9rem" },
		height: "3rem",
	},

	// start mobile
	mobileScoreboardStrip: {
		width: "100%",
		display: "flex",
		flexDirection: "row",
		justifyContent: "space-evenly",
		alignItems: "center",
		backgroundColor: "background.paper",
		borderBottom: "1px solid",
		borderColor: "divider",
		py: 1,
		px: 2,
		gap: 1,
		boxShadow: 1,
	},

	mobileMusicContainer: {
		width: "20rem",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		borderRadius: 0,
		minHeight: "250px",
		my: 2,
	},

	mobileMusicDisplay: {
		width: "20rem",
		height: "auto",
		minHeight: "200px",
		display: "flex",
		justifyContent: "center",
		alignItems: "center",
		px: 1,
	},

	mobileAnswerButtonsContainer: {
		width: "100%",
		display: "flex",
		flexDirection: "column",
		gap: 0.75,
		px: { xs: 0.5, sm: 1 },
		mb: 2,
		overflow: "hidden",
	},

	mobileButtonRow: {
		display: "flex",
		flexDirection: "row",
		justifyContent: "space-between",
		gap: { xs: 0.25, sm: 0.5 },
		width: "100%",
		overflow: "hidden",
	},

	mobileAnswerButton: {
		flex: 1,
		flexShrink: 1,
		minWidth: 0,
		maxWidth: "100%",
		boxSizing: "border-box",
		minHeight: { xs: "48px", sm: "52px" },
		textTransform: "none",
		fontSize: { xs: "0.65rem", sm: "0.85rem", md: "0.95rem" },
		fontWeight: 500,
		px: { xs: 0.25, sm: 0.5, md: 1 },
		overflow: "hidden",
		textOverflow: "ellipsis",
	},

	stickyControlsBar: {
		position: "fixed",
		bottom: 0,
		left: 0,
		right: 0,
		display: "flex",
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		backgroundColor: "background.paper",
		borderTop: "2px solid",
		borderColor: "divider",
		p: { xs: 1, sm: 2 },
		gap: { xs: 1, sm: 2 },
		boxShadow: "0 -2px 10px rgba(0,0,0,0.1)",
		zIndex: 1000,
		overflow: "hidden",
	},
};

export { noteGameStyles };

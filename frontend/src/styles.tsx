import { SxProps } from "@mui/material";

// TODO: change ALL of the box shadown to simply fade to a lighter gray on
// hover
const navbarStyles: Record<string, SxProps> = {
	musicNoteIcon: {
		display: { xs: "none", md: "flex" },
		mr: 1,
	},
	smdTypography: {
		mr: 2,
		display: { xs: "none", md: "flex" },
		fontFamily: "monospace",
		fontWeight: 700,
		letterSpacing: ".3rem",
		color: "inherit",
		textDecoration: "none",
	},
	menuIconButton: {
		flexGrow: 1,
		display: { xs: "flex", md: "none" },
	},
	menu: {
		display: { xs: "block", md: "none" },
	},
	logoTypography: {
		mr: 2,
		display: { xs: "flex", md: "none" },
		flexGrow: 1,
		fontFamily: "monospace",
		fontWeight: 700,
		letterSpacing: ".3rem",
		color: "inherit",
		textDecoration: "none",
	},
	button: {
		my: 2,
		color: "white",
		display: "block",
	},
};

const generatedMusicStyles: Record<string, SxProps> = {
	sheetMusicContainer: {
		display: "flex",
		width: "66%",
	},
	sheetMusic: {
		width: "100%",
		height: "35rem",
		alignContent: "center",
		justifyContent: "center",
	},
	musicButtonDiv: {
		display: "flex",
		mt: 2,
		justifyContent: "center",
		gap: "1rem",
	},
};

const landingPageStyles: Record<string, SxProps> = {
	heroSection: {
		bgcolor: "primary.main",
		color: "white",
		py: { xs: 8, md: 12 },
		textAlign: "center",
	},
	heroTitle: {
		fontWeight: 700,
		mb: 2,
		fontSize: { xs: "2.5rem", md: "3.5rem" },
	},
	heroSubtitle: {
		mb: 4,
		fontSize: { xs: "1.2rem", md: "1.5rem" },
		opacity: 0.9,
	},
	heroButton: {
		px: 4,
		py: 1.5,
		fontSize: "1.1rem",
		fontWeight: 600,
	},
	section: {
		py: { xs: 6, md: 8 },
	},
	sectionTitle: {
		fontWeight: 700,
		mb: 4,
		textAlign: "center",
	},
	featureCard: {
		height: "100%",
		display: "flex",
		flexDirection: "column",
		transition: "transform 0.2s, box-shadow 0.2s",
		"&:hover": {
			transform: "translateY(-8px)",
			boxShadow: 6,
		},
	},
	featureCardContent: {
		flexGrow: 1,
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		textAlign: "center",
		p: 3,
	},
	featureIcon: {
		bgcolor: "primary.main",
		color: "white",
		width: 64,
		height: 64,
		mb: 2,
	},
	featureTitle: {
		fontWeight: 600,
		mb: 1,
	},
	stepContainer: {
		display: "flex",
		alignItems: "center",
		gap: 2,
		mb: 3,
	},
	stepNumber: {
		bgcolor: "primary.main",
		color: "white",
		width: 48,
		height: 48,
		borderRadius: "50%",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		fontWeight: 700,
		fontSize: "1.2rem",
		flexShrink: 0,
	},
	contentSection: {
		py: 3,
	},
	missionCard: {
		p: 4,
		mb: 4,
		bgcolor: "primary.main",
		color: "white",
	},
	iconTextSection: {
		display: "flex",
		gap: 3,
		alignItems: "flex-start",
		mb: 4,
	},
	sectionIcon: {
		bgcolor: "primary.main",
		color: "white",
		width: 56,
		height: 56,
		flexShrink: 0,
	},
	audienceCard: {
		p: 3,
		height: "100%",
		textAlign: "center",
		transition: "transform 0.2s, box-shadow 0.2s",
		"&:hover": {
			transform: "translateY(-8px)",
			boxShadow: 6,
		},
	},
};

const userInfoStyles: Record<string, SxProps> = {
	cardContainer: {
		p: { xs: 2, sm: 3 },
		mb: 3,
		borderRadius: 2,
		backgroundColor: "background.paper",
	},
	mainLayout: {
		display: "flex",
		flexDirection: { xs: "column", md: "row" },
		alignItems: { xs: "flex-start", md: "center" },
		justifyContent: "space-between",
		gap: { xs: 3, md: 4 },
	},
	profileSection: {
		display: "flex",
		gap: 2,
		alignItems: "center",
		flex: { xs: "1", md: "0 1 auto" },
	},
	avatar: {
		width: 56,
		height: 56,
		backgroundColor: "primary.main",
		fontSize: "1.25rem",
		fontWeight: 600,
	},
	nameRoleContainer: {
		display: "flex",
		alignItems: "center",
		gap: 1,
		mb: 0.5,
	},
	userName: {
		fontWeight: 700,
		fontSize: { xs: "1.25rem", sm: "1.5rem" },
		lineHeight: 1.2,
		color: "text.primary",
	},
	roleChipDesktop: {
		height: 20,
		fontSize: "0.7rem",
		fontWeight: 600,
		display: { xs: "none", sm: "inline-flex" },
	},
	roleChipMobile: {
		height: 20,
		fontSize: "0.7rem",
		fontWeight: 600,
		mt: 1,
		display: { xs: "inline-flex", sm: "none" },
	},
	joinedDate: {
		color: "text.secondary",
		fontSize: { xs: "0.875rem", sm: "0.9rem" },
	},
	statsActionsContainer: {
		display: "flex",
		alignItems: "center",
		gap: { xs: 3, sm: 4 },
		width: { xs: "100%", md: "auto" },
		justifyContent: { xs: "space-between", md: "flex-end" },
	},
	statsContainer: {
		display: "flex",
		gap: { xs: 3, sm: 4 },
		alignItems: "center",
	},
	statMetricContainer: {
		textAlign: "center",
	},
	statLabel: {
		color: "text.secondary",
		fontSize: { xs: "0.7rem", sm: "0.75rem" },
		fontWeight: 500,
		textTransform: "uppercase",
		letterSpacing: 0.5,
		display: "block",
		mb: 0.5,
	},
	statValueLarge: {
		fontWeight: 700,
		fontSize: { xs: "1.5rem", sm: "2rem" },
		color: "text.primary",
		lineHeight: 1,
	},
	statValueSmall: {
		fontWeight: 700,
		fontSize: { xs: "1.25rem", sm: "1.5rem" },
		color: "text.primary",
		lineHeight: 1,
	},
	statDivider: {
		display: { xs: "none", sm: "block" },
		height: 40,
		alignSelf: "center",
	},
	logoutButton: {
		minWidth: { xs: 80, sm: 90 },
		height: 36,
	},
};

const authPageStyles: Record<string, SxProps> = {
	container: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		minHeight: "80vh",
		py: { xs: 2, sm: 4 },
	},
	card: {
		width: "100%",
		maxWidth: 500,
	},
	cardContent: {
		p: { xs: 3, sm: 4 },
	},
	title: {
		textAlign: "center",
		fontWeight: 600,
		mb: 1,
	},
	subtitle: {
		textAlign: "center",
		mb: 3,
	},
	submitButton: {
		height: 48,
		position: "relative",
	},
	footerText: {
		mt: 2,
		textAlign: "center",
	},
	footerLink: {
		textDecoration: "none",
		fontWeight: 600,
		"&:hover": {
			textDecoration: "underline",
		},
	},
	passwordStrengthContainer: {
		mb: 2,
	},
	passwordStrengthHeader: {
		display: "flex",
		justifyContent: "space-between",
		mb: 0.5,
	},
	passwordStrengthBar: {
		height: 6,
		borderRadius: 1,
	},
};

export {
	navbarStyles,
	generatedMusicStyles,
	landingPageStyles,
	userInfoStyles,
	authPageStyles,
};

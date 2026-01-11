import {
	Tooltip,
	IconButton,
	Menu,
	MenuItem,
	Typography,
	Avatar,
	Divider,
	Button,
} from "@mui/material";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import PersonIcon from "@mui/icons-material/Person";
import LoginIcon from "@mui/icons-material/Login";

const UserOptions = () => {
	const { currentUser, isAuthenticated, logout } = useAuth();
	const navigate = useNavigate();

	const settings = [
		{ name: "Dashboard", path: "/dashboard" },
		{ name: "Profile", path: "/profile" },
		{ name: "Account", path: "/account" },
	];

	const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);

	const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
		setAnchorElUser(event.currentTarget);
	};

	const handleCloseUserMenu = () => {
		setAnchorElUser(null);
	};

	const handleLogout = () => {
		logout();
		handleCloseUserMenu();
		navigate("/login");
	};

	const getInitials = (firstName: string, lastName: string): string => {
		return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
	};

	// Show login button if not authenticated
	if (!isAuthenticated) {
		return (
			<Button
				component={Link}
				to="/login"
				variant="outlined"
				startIcon={<LoginIcon />}
				color="inherit"
				sx={{
					ml: 2,
					borderColor: "white",
					color: "white",
					"&:hover": {
						borderColor: "white",
						backgroundColor: "rgba(255, 255, 255, 0.1)",
					},
				}}
			>
				Login
			</Button>
		);
	}

	return (
		<>
			<Tooltip title="Open settings">
				<IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
					<Avatar
						sx={{
							bgcolor: "primary.main",
							width: 40,
							height: 40,
						}}
					>
						{currentUser ? (
							getInitials(currentUser.first_name, currentUser.last_name)
						) : (
							<PersonIcon />
						)}
					</Avatar>
				</IconButton>
			</Tooltip>
			<Menu
				sx={{ mt: "45px" }}
				id="menu-appbar"
				anchorEl={anchorElUser}
				anchorOrigin={{
					vertical: "top",
					horizontal: "right",
				}}
				keepMounted
				transformOrigin={{
					vertical: "top",
					horizontal: "right",
				}}
				open={Boolean(anchorElUser)}
				onClose={handleCloseUserMenu}
			>
				{currentUser && (
					<MenuItem disabled sx={{ opacity: "1 !important" }}>
						<Typography sx={{ fontWeight: 600 }}>
							{currentUser.first_name} {currentUser.last_name}
						</Typography>
					</MenuItem>
				)}
				{currentUser && (
					<MenuItem disabled sx={{ opacity: "0.7 !important", py: 0.5 }}>
						<Typography variant="body2" color="text.secondary">
							{currentUser.email}
						</Typography>
					</MenuItem>
				)}
				<Divider sx={{ my: 1 }} />
				{settings.map((setting) => (
					<MenuItem
						key={setting.name}
						component={Link}
						to={setting.path}
						onClick={handleCloseUserMenu}
					>
						<Typography sx={{ textAlign: "center" }}>{setting.name}</Typography>
					</MenuItem>
				))}
				<Divider sx={{ my: 1 }} />
				<MenuItem key="Log Out" onClick={handleLogout}>
					<Typography sx={{ textAlign: "center", color: "error.main" }}>
						Log Out
					</Typography>
				</MenuItem>
			</Menu>
		</>
	);
};

export default UserOptions;

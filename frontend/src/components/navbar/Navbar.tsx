import * as React from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Menu from "@mui/material/Menu";
import MenuIcon from "@mui/icons-material/Menu";
import Container from "@mui/material/Container";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import { Link } from "react-router-dom";
import { navbarStyles } from "../../styles";
import UserOptions from "./UserOptions";
import { useState } from "react";

const pages = [
	{ name: "Tremolo", path: "/" },
	{ name: "Practice", path: "/sheet-music" },
	{ name: "Note Game", path: "/note-game" },
	{ name: "About", path: "/about" },
	{ name: "Convert", path: "/convert" },
];

function NavBar() {
	const [anchorElNav, setAnchorElNav] = useState<null | HTMLElement>(null);
	const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => {
		setAnchorElNav(event.currentTarget);
	};

	const handleCloseNavMenu = () => {
		setAnchorElNav(null);
	};

	return (
		<AppBar position="static">
			<Container maxWidth="xl">
				<Toolbar disableGutters>
					<IconButton
						component={Link}
						to="/"
						sx={navbarStyles.musicNoteIcon}
						color="inherit"
						aria-label="home"
					>
						<MusicNoteIcon />
					</IconButton>
					<Box sx={navbarStyles.menuIconButton}>
						<IconButton
							size="large"
							aria-label="account of current user"
							aria-controls="menu-appbar"
							aria-haspopup="true"
							onClick={handleOpenNavMenu}
							color="inherit"
						>
							<MenuIcon />
						</IconButton>
						<Menu
							id="menu-appbar"
							anchorEl={anchorElNav}
							anchorOrigin={{
								vertical: "bottom",
								horizontal: "left",
							}}
							keepMounted
							transformOrigin={{
								vertical: "top",
								horizontal: "left",
							}}
							open={Boolean(anchorElNav)}
							onClose={handleCloseNavMenu}
							sx={navbarStyles.menu}
						>
							{pages.map((page) => (
								<MenuItem
									key={page.name}
									component={Link}
									to={page.path}
									onClick={handleCloseNavMenu}
								>
									<Typography sx={{ textAlign: "center" }}>
										{page.name}
									</Typography>
								</MenuItem>
							))}
						</Menu>
					</Box>
					<Typography
						variant="h5"
						noWrap
						component={Link}
						to="/"
						sx={navbarStyles.logoTypography}
					>
						Tremolo
					</Typography>
					<Box sx={{ flexGrow: 1, display: { xs: "none", md: "flex" } }}>
						{pages.map((page) => (
							<Button
								key={page.name}
								component={Link}
								onClick={handleCloseNavMenu}
								to={page.path}
								sx={navbarStyles.button}
							>
								{page.name}
							</Button>
						))}
					</Box>
					<Box sx={{ flexGrow: 0 }}>
						<UserOptions />
					</Box>
				</Toolbar>
			</Container>
		</AppBar>
	);
}
export default NavBar;

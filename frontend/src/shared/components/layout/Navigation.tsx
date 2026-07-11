import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
	ChevronDown,
	Music,
	Menu,
	X,
	Sun,
	Moon,
	User,
	LogOut,
	LayoutDashboard,
	UserCircle,
	Settings,
	Users,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { useFriendsStore } from "@/stores/friends.store";
import { useThemeStore } from "@/stores/theme.store";
import { useLogout } from "@/shared/hooks/queries/useAuthQuery";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";

export function Navigation() {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [userMenuOpen, setUserMenuOpen] = useState(false);
	const [gamesMenuOpen, setGamesMenuOpen] = useState(false);
	const { user, isAuthenticated } = useAuthStore();
	const { theme, toggleTheme } = useThemeStore();
	const logoutMutation = useLogout();
	const togglePanel = useFriendsStore((state) => state.togglePanel);
	const isPanelOpen = useFriendsStore((state) => state.isPanelOpen);
	const location = useLocation();

	const primaryLinks = [
		{ to: "/home", label: "Tremolo" },
		{ to: "/sheet-music", label: "Practice" },
	];

	const gameLinks = [
		{
			to: "/note-game",
			label: "Note Game",
			description: "Name notes on the staff",
		},
		{
			to: "/key-signature-game",
			label: "Key Signatures",
			description: "Name the key from its signature",
		},
		{
			to: "/interval-game",
			label: "Intervals",
			description: "Name the distance between two notes",
		},
		{
			to: "/scale-game",
			label: "Scales",
			description: "Name the scale type you see",
		},
		{
			to: "/chord-game",
			label: "Chords",
			description: "Name the chord quality you see",
		},
	];

	const secondaryLinks = [
		{ to: "/about", label: "About" },
		{ to: "/convert", label: "Convert" },
	];

	const isActive = (path: string) => location.pathname === path;
	const isGameActive = gameLinks.some((link) => isActive(link.to));

	useEffect(() => {
		if (!gamesMenuOpen) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setGamesMenuOpen(false);
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [gamesMenuOpen]);

	const handleLogout = () => {
		logoutMutation.mutate();
		setUserMenuOpen(false);
		setMobileMenuOpen(false);
	};

	return (
		<nav className="sticky top-0 z-50 w-full border-b-2 border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="container mx-auto px-4">
				<div className="flex h-16 items-center justify-between">
					{/* Logo */}
					<Link to="/home" className="flex items-center space-x-2 group">
						<div className="rounded-lg bg-primary p-2 group-hover:scale-110 transition-transform">
							<Music className="h-6 w-6 text-primary-foreground" />
						</div>
						<span className="text-xl font-bold hidden sm:inline-block">
							Tremolo
						</span>
					</Link>

					{/* Desktop Navigation */}
					<div className="hidden md:flex items-center space-x-1">
						{primaryLinks.map((link) => (
							<Link
								key={link.to}
								to={link.to}
								className={cn(
									"px-4 py-2 rounded-md text-sm font-medium transition-all",
									isActive(link.to)
										? "bg-primary text-primary-foreground"
										: "text-foreground hover:bg-accent hover:text-accent-foreground",
								)}
							>
								{link.label}
							</Link>
						))}

						{/* Games Menu */}
						<div className="relative">
							<button
								onClick={() => setGamesMenuOpen(!gamesMenuOpen)}
								aria-haspopup="menu"
								aria-expanded={gamesMenuOpen}
								className={cn(
									"flex items-center gap-1 px-4 py-2 rounded-md text-sm font-medium transition-all",
									isGameActive
										? "bg-primary text-primary-foreground"
										: "text-foreground hover:bg-accent hover:text-accent-foreground",
								)}
							>
								Games
								<ChevronDown
									className={cn(
										"h-4 w-4 transition-transform",
										gamesMenuOpen && "rotate-180",
									)}
								/>
							</button>

							{gamesMenuOpen && (
								<>
									<div
										className="fixed inset-0 z-40"
										onClick={() => setGamesMenuOpen(false)}
										onKeyDown={(e) =>
											(e.key === "Enter" || e.key === " ") &&
											setGamesMenuOpen(false)
										}
										role="button"
										tabIndex={0}
										aria-label="Close games menu"
									/>
									<div className="absolute left-0 mt-2 w-72 z-50 rounded-lg border-2 border-border bg-popover p-2 shadow-lg animate-fade-in">
										{gameLinks.map((link) => (
											<Link
												key={link.to}
												to={link.to}
												onClick={() => setGamesMenuOpen(false)}
												className={cn(
													"block px-3 py-2 rounded-md transition-colors",
													isActive(link.to)
														? "bg-primary text-primary-foreground"
														: "hover:bg-accent",
												)}
											>
												<span className="block text-sm font-medium">
													{link.label}
												</span>
												<span
													className={cn(
														"block text-xs",
														isActive(link.to)
															? "text-primary-foreground/80"
															: "text-muted-foreground",
													)}
												>
													{link.description}
												</span>
											</Link>
										))}
									</div>
								</>
							)}
						</div>

						{secondaryLinks.map((link) => (
							<Link
								key={link.to}
								to={link.to}
								className={cn(
									"px-4 py-2 rounded-md text-sm font-medium transition-all",
									isActive(link.to)
										? "bg-primary text-primary-foreground"
										: "text-foreground hover:bg-accent hover:text-accent-foreground",
								)}
							>
								{link.label}
							</Link>
						))}
					</div>

					{/* Right Section: Theme Toggle + User Menu */}
					<div className="flex items-center space-x-2">
						{/* Theme Toggle */}
						<Button
							variant="ghost"
							size="icon"
							onClick={toggleTheme}
							className="rounded-full"
						>
							{theme === "dark" ? (
								<Sun className="h-5 w-5" />
							) : (
								<Moon className="h-5 w-5" />
							)}
						</Button>

						{/* Friends Toggle - Auth Only */}
						{isAuthenticated && (
							<Button
								variant="ghost"
								size="icon"
								onClick={togglePanel}
								className={cn(
									"rounded-full",
									isPanelOpen && "bg-accent text-accent-foreground",
								)}
							>
								<Users className="h-5 w-5" />
							</Button>
						)}

						{/* Desktop User Menu */}
						{isAuthenticated ? (
							<div className="relative hidden md:block">
								<button
									onClick={() => setUserMenuOpen(!userMenuOpen)}
									className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground font-bold hover:scale-110 transition-transform"
								>
									{user?.firstName[0]}
									{user?.lastName[0]}
								</button>

								{userMenuOpen && (
									<>
										<div
											className="fixed inset-0 z-40"
											onClick={() => setUserMenuOpen(false)}
											onKeyDown={(e) =>
												(e.key === "Enter" || e.key === " ") &&
												setUserMenuOpen(false)
											}
											role="button"
											tabIndex={0}
											aria-label="Close user menu"
										/>
										<div className="absolute right-0 mt-2 w-56 z-50 rounded-lg border-2 border-border bg-popover p-2 shadow-lg animate-fade-in">
											<div className="px-3 py-2 border-b-2 border-border mb-2">
												<p className="text-sm font-bold">
													{user?.firstName} {user?.lastName}
												</p>
												<p className="text-xs text-muted-foreground">
													{user?.email}
												</p>
											</div>
											<Link
												to="/dashboard"
												onClick={() => setUserMenuOpen(false)}
												className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-accent text-sm transition-colors"
											>
												<LayoutDashboard className="h-4 w-4" />
												<span>Dashboard</span>
											</Link>
											<Link
												to="/profile"
												onClick={() => setUserMenuOpen(false)}
												className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-accent text-sm transition-colors"
											>
												<UserCircle className="h-4 w-4" />
												<span>Profile</span>
											</Link>
											<Link
												to="/account"
												onClick={() => setUserMenuOpen(false)}
												className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-accent text-sm transition-colors"
											>
												<Settings className="h-4 w-4" />
												<span>Account</span>
											</Link>
											<div className="border-t-2 border-border my-2" />
											<button
												onClick={handleLogout}
												className="w-full flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-destructive hover:text-destructive-foreground text-sm transition-colors"
											>
												<LogOut className="h-4 w-4" />
												<span>Log Out</span>
											</button>
										</div>
									</>
								)}
							</div>
						) : (
							<Link to="/login" className="hidden md:block">
								<Button variant="default" size="sm">
									<User className="mr-2 h-4 w-4" />
									Login
								</Button>
							</Link>
						)}

						{/* Mobile Menu Button */}
						<Button
							variant="ghost"
							size="icon"
							className="md:hidden"
							onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
						>
							{mobileMenuOpen ? (
								<X className="h-6 w-6" />
							) : (
								<Menu className="h-6 w-6" />
							)}
						</Button>
					</div>
				</div>

				{/* Mobile Menu */}
				{mobileMenuOpen && (
					<div className="md:hidden py-4 space-y-2 border-t-2 border-border animate-slide-in">
						{primaryLinks.map((link) => (
							<Link
								key={link.to}
								to={link.to}
								onClick={() => setMobileMenuOpen(false)}
								className={cn(
									"block px-4 py-2 rounded-md text-sm font-medium transition-all",
									isActive(link.to)
										? "bg-primary text-primary-foreground"
										: "text-foreground hover:bg-accent",
								)}
							>
								{link.label}
							</Link>
						))}

						<p className="px-4 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
							Games
						</p>
						{gameLinks.map((link) => (
							<Link
								key={link.to}
								to={link.to}
								onClick={() => setMobileMenuOpen(false)}
								className={cn(
									"block px-4 py-2 rounded-md text-sm font-medium transition-all",
									isActive(link.to)
										? "bg-primary text-primary-foreground"
										: "text-foreground hover:bg-accent",
								)}
							>
								{link.label}
							</Link>
						))}

						<div className="border-t-2 border-border my-2" />
						{secondaryLinks.map((link) => (
							<Link
								key={link.to}
								to={link.to}
								onClick={() => setMobileMenuOpen(false)}
								className={cn(
									"block px-4 py-2 rounded-md text-sm font-medium transition-all",
									isActive(link.to)
										? "bg-primary text-primary-foreground"
										: "text-foreground hover:bg-accent",
								)}
							>
								{link.label}
							</Link>
						))}

						{isAuthenticated ? (
							<>
								<div className="border-t-2 border-border my-2" />
								<button
									onClick={() => {
										togglePanel();
										setMobileMenuOpen(false);
									}}
									className="w-full text-left px-4 py-2 rounded-md text-sm font-medium hover:bg-accent"
								>
									Friends
								</button>
								<Link
									to="/dashboard"
									onClick={() => setMobileMenuOpen(false)}
									className="block px-4 py-2 rounded-md text-sm font-medium hover:bg-accent"
								>
									Dashboard
								</Link>
								<Link
									to="/profile"
									onClick={() => setMobileMenuOpen(false)}
									className="block px-4 py-2 rounded-md text-sm font-medium hover:bg-accent"
								>
									Profile
								</Link>
								<Link
									to="/account"
									onClick={() => setMobileMenuOpen(false)}
									className="block px-4 py-2 rounded-md text-sm font-medium hover:bg-accent"
								>
									Account
								</Link>
								<button
									onClick={handleLogout}
									className="w-full text-left px-4 py-2 rounded-md text-sm font-medium hover:bg-destructive hover:text-destructive-foreground"
								>
									Log Out
								</button>
							</>
						) : (
							<Link
								to="/login"
								onClick={() => setMobileMenuOpen(false)}
								className="block px-4 py-2 rounded-md text-sm font-medium hover:bg-accent"
							>
								Login
							</Link>
						)}
					</div>
				)}
			</div>
		</nav>
	);
}

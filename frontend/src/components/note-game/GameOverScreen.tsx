import { Box, Fade, Typography, Button } from "@mui/material";
import { RecentGamesChart } from "./RecentGamesChart";
import { TopBar } from "./TopBar";

interface GameOverScreenProps {
	isMobile: boolean;
	accuracy: number;
	npm: number;
	onPlayAgain: () => void;
	gameMode: "time" | "notes";
	timeLimit: number;
	noteLimit: number;
	timeOptions: number[];
	noteOptions: number[];
	scaleChoice: string;
	octaveChoice: string;
	onGameModeChange: (mode: "time" | "notes") => void;
	onTimeLimitChange: (limit: number) => void;
	onNoteLimitChange: (limit: number) => void;
	onScaleChange: (scale: string) => void;
	onOctaveChange: (octave: string) => void;
	formatTime: (seconds: number) => string;
}

export const GameOverScreen = ({
	isMobile,
	accuracy,
	npm,
	onPlayAgain,
	gameMode,
	timeLimit,
	noteLimit,
	timeOptions,
	noteOptions,
	scaleChoice,
	octaveChoice,
	onGameModeChange,
	onTimeLimitChange,
	onNoteLimitChange,
	onScaleChange,
	onOctaveChange,
	formatTime,
}: GameOverScreenProps) => {
	return (
		<Fade in={true} timeout={500}>
			<Box
				my={isMobile ? "0" : "2rem"}
				sx={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					flexDirection: "column",
					paddingBottom: isMobile ? "140px" : "0",
					gap: 2,
				}}
			>
				<TopBar
					gameStarted={false}
					gameMode={gameMode}
					timeRemaining={0}
					totalCounter={0}
					noteLimit={noteLimit}
					accuracy={0}
					formatTime={formatTime}
					timeLimit={timeLimit}
					timeOptions={timeOptions}
					noteOptions={noteOptions}
					scaleChoice={scaleChoice}
					octaveChoice={octaveChoice}
					onGameModeChange={onGameModeChange}
					onTimeLimitChange={onTimeLimitChange}
					onNoteLimitChange={onNoteLimitChange}
					onScaleChange={onScaleChange}
					onOctaveChange={onOctaveChange}
				/>

				<Box
					sx={{
						display: "flex",
						gap: 4,
						width: "100%",
						maxWidth: 1200,
						mt: 2,
						flexDirection: { xs: "column", md: "row" },
					}}
				>
					<Box
						sx={{
							display: "flex",
							flexDirection: "column",
							minWidth: 150,
							alignItems: { xs: "center", md: "flex-start" },
							justifyContent: "center",
						}}
					>
						<Typography variant="caption" color="text.secondary">
							npm
						</Typography>
						<Typography
							variant="h1"
							sx={{
								fontSize: { xs: "3rem", md: "4rem" },
								fontWeight: 500,
								lineHeight: 1,
							}}
						>
							{npm}
						</Typography>

						<Typography variant="caption" color="text.secondary" sx={{ mt: 3 }}>
							acc
						</Typography>
						<Typography
							variant="h1"
							sx={{
								fontSize: { xs: "3rem", md: "4rem" },
								fontWeight: 500,
								lineHeight: 1,
							}}
						>
							{accuracy}%
						</Typography>
					</Box>

					<Box sx={{ flex: 1, minWidth: 0 }}>
						<RecentGamesChart />
					</Box>

					<Box
						sx={{
							minWidth: 150,
							display: { xs: "none", md: "block" },
						}}
					/>
				</Box>

				<Button
					variant="contained"
					onClick={onPlayAgain}
					sx={{
						padding: "10px 20px",
						fontSize: "16px",
						mt: 4,
					}}
				>
					Play Again
				</Button>
			</Box>
		</Fade>
	);
};

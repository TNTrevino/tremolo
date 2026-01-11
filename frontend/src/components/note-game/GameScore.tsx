import { Box, Typography } from "@mui/material";

interface GameScoreProps {
	gameMode: "time" | "notes";
	timeRemaining: number;
	totalCounter: number;
	noteLimit: number;
	accuracy: number;
	formatTime: (seconds: number) => string;
}

export const GameScore = ({
	gameMode,
	timeRemaining,
	totalCounter,
	noteLimit,
	accuracy,
	formatTime,
}: GameScoreProps) => {
	return (
		<Box
			sx={{
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				gap: 4,
				mb: 3,
			}}
		>
			{gameMode === "time" ? (
				<Typography variant="h6">{formatTime(timeRemaining)}</Typography>
			) : (
				<Typography variant="h6">
					{totalCounter} / {noteLimit}
				</Typography>
			)}
			<Typography variant="h6">{accuracy}%</Typography>
		</Box>
	);
};

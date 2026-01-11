import { Box } from "@mui/material";
import { GameScore } from "./GameScore";
import { GameModeSelector } from "./GameModeSelector";
import { LimitSelector } from "./LimitSelector";
import { MusicalSettings } from "./MusicalSettings";

interface TopBarProps {
	gameStarted: boolean;
	gameMode: "time" | "notes";
	timeRemaining: number;
	totalCounter: number;
	noteLimit: number;
	accuracy: number;
	formatTime: (seconds: number) => string;
	timeLimit: number;
	timeOptions: number[];
	noteOptions: number[];
	scaleChoice: string;
	octaveChoice: string;
	onGameModeChange: (mode: "time" | "notes") => void;
	onTimeLimitChange: (limit: number) => void;
	onNoteLimitChange: (limit: number) => void;
	onScaleChange: (scale: string) => void;
	onOctaveChange: (octave: string) => void;
}

export const TopBar = ({
	gameStarted,
	gameMode,
	timeRemaining,
	totalCounter,
	noteLimit,
	accuracy,
	formatTime,
	timeLimit,
	timeOptions,
	noteOptions,
	scaleChoice,
	octaveChoice,
	onGameModeChange,
	onTimeLimitChange,
	onNoteLimitChange,
	onScaleChange,
	onOctaveChange,
}: TopBarProps) => {
	if (gameStarted) {
		return (
			<GameScore
				gameMode={gameMode}
				timeRemaining={timeRemaining}
				totalCounter={totalCounter}
				noteLimit={noteLimit}
				accuracy={accuracy}
				formatTime={formatTime}
			/>
		);
	}

	return (
		<Box
			sx={{
				display: "flex",
				justifyContent: "center",
				alignItems: "baseline",
				gap: 2,
				mb: 3,
				flexWrap: "wrap",
			}}
		>
			<GameModeSelector
				gameMode={gameMode}
				onGameModeChange={onGameModeChange}
			/>

			<LimitSelector
				gameMode={gameMode}
				timeLimit={timeLimit}
				noteLimit={noteLimit}
				timeOptions={timeOptions}
				noteOptions={noteOptions}
				onTimeLimitChange={onTimeLimitChange}
				onNoteLimitChange={onNoteLimitChange}
			/>

			<MusicalSettings
				scaleChoice={scaleChoice}
				octaveChoice={octaveChoice}
				onScaleChange={onScaleChange}
				onOctaveChange={onOctaveChange}
			/>
		</Box>
	);
};

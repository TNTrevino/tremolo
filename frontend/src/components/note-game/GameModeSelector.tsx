import { Button, ButtonGroup } from "@mui/material";

interface GameModeSelectorProps {
	gameMode: "time" | "notes";
	onGameModeChange: (mode: "time" | "notes") => void;
}

export const GameModeSelector = ({
	gameMode,
	onGameModeChange,
}: GameModeSelectorProps) => {
	return (
		<ButtonGroup size="small">
			<Button
				variant={gameMode === "time" ? "contained" : "outlined"}
				onClick={() => onGameModeChange("time")}
			>
				time
			</Button>
			<Button
				variant={gameMode === "notes" ? "contained" : "outlined"}
				onClick={() => onGameModeChange("notes")}
			>
				notes
			</Button>
		</ButtonGroup>
	);
};

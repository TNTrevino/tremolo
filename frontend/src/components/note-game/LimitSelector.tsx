import { Button, ButtonGroup } from "@mui/material";

interface LimitSelectorProps {
	gameMode: "time" | "notes";
	timeLimit: number;
	noteLimit: number;
	timeOptions: number[];
	noteOptions: number[];
	onTimeLimitChange: (time: number) => void;
	onNoteLimitChange: (notes: number) => void;
}

export const LimitSelector = ({
	gameMode,
	timeLimit,
	noteLimit,
	timeOptions,
	noteOptions,
	onTimeLimitChange,
	onNoteLimitChange,
}: LimitSelectorProps) => {
	return gameMode === "time" ? (
		<ButtonGroup size="small">
			{timeOptions.map((time) => (
				<Button
					key={time}
					variant={timeLimit === time ? "contained" : "outlined"}
					onClick={() => onTimeLimitChange(time)}
				>
					{time}
				</Button>
			))}
		</ButtonGroup>
	) : (
		<ButtonGroup size="small">
			{noteOptions.map((notes) => (
				<Button
					key={notes}
					variant={noteLimit === notes ? "contained" : "outlined"}
					onClick={() => onNoteLimitChange(notes)}
				>
					{notes}
				</Button>
			))}
		</ButtonGroup>
	);
};

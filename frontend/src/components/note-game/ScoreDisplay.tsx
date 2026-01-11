import { Typography } from "@mui/material";

interface ScoreboardStatsProps {
	correctCounter: number;
	totalCounter: number;
	currentTime: number;
	startTime: number;
}

export const ScoreboardStats = ({
	correctCounter,
	totalCounter,
	currentTime,
	startTime,
}: ScoreboardStatsProps) => {
	const accuracy = correctCounter / totalCounter;
	const npm = Math.floor((totalCounter / (currentTime - startTime)) * 100);

	return {
		accuracy: isNaN(accuracy)
			? null
			: accuracy === 1
				? "100%"
				: `${Math.round(accuracy * 100)}%`,
		fraction: `${correctCounter}/${totalCounter}`,
		npm,
	};
};

interface ScoreDisplayProps {
	correctCounter: number;
	totalCounter: number;
	currentTime: number;
	startTime: number;
	variant: "mobile" | "desktop";
}

export const ScoreDisplay = ({
	correctCounter,
	totalCounter,
	currentTime,
	startTime,
	variant,
}: ScoreDisplayProps) => {
	const stats = ScoreboardStats({
		correctCounter,
		totalCounter,
		currentTime,
		startTime,
	});

	if (!stats.accuracy) {
		return (
			<Typography
				fontSize={variant === "mobile" ? "0.875rem" : "1rem"}
				textAlign="center"
			>
				{variant === "mobile"
					? "Answer to start!"
					: "Answer to start a session!"}
			</Typography>
		);
	}

	return (
		<>
			<Typography
				fontSize={variant === "mobile" ? "0.875rem" : "1rem"}
				fontWeight="500"
			>
				{stats.accuracy}
			</Typography>
			<Typography fontSize={variant === "mobile" ? "0.875rem" : "1rem"}>
				{stats.fraction}
			</Typography>
			<Typography fontSize={variant === "mobile" ? "0.875rem" : "1rem"}>
				NPM: {stats.npm}
			</Typography>
		</>
	);
};

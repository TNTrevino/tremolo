import { Box, Fade, useTheme, useMediaQuery } from "@mui/material";
import { useState, MouseEvent } from "react";
import { NoteGameMobileView } from "../../components/note-game/NoteGameMobileView";
import { NoteGameDesktopView } from "../../components/note-game/NoteGameDesktopView";
import { NoteGameViewProps } from "../../components/note-game/NoteGameViewProps";
import { TopBar } from "../../components/note-game/TopBar";
import { GameOverScreen } from "../../components/note-game/GameOverScreen";
import { useNoteGame } from "../../hooks/useNoteGame";

const TIME_OPTIONS = [15, 30, 60, 120];
const NOTE_OPTIONS = [10, 25, 50, 100];

const NoteGame = () => {
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("md"));

	// All game logic is now handled by the useNoteGame hook
	const game = useNoteGame();

	// UI-only state for dropdown menus
	const [scaleAnchorEl, setScaleAnchorEl] = useState<null | HTMLElement>(null);
	const [octaveAnchorEl, setOctaveAnchorEl] = useState<null | HTMLElement>(
		null,
	);

	// Menu handlers
	const handleScaleClick = (event: MouseEvent<HTMLElement>) => {
		setScaleAnchorEl(event.currentTarget);
	};
	const handleOctaveClick = (event: MouseEvent<HTMLElement>) => {
		setOctaveAnchorEl(event.currentTarget);
	};
	const handleScaleClose = () => {
		setScaleAnchorEl(null);
	};
	const handleOctaveClose = () => {
		setOctaveAnchorEl(null);
	};

	const chooseScale = (scale: string) => {
		game.handleScaleChange(scale);
		handleScaleClose();
	};

	const chooseOctave = (octave: string) => {
		game.handleOctaveChange(octave);
		handleOctaveClose();
	};

	const openScaleOptions = Boolean(scaleAnchorEl);
	const openOctaveOptions = Boolean(octaveAnchorEl);

	// Utility function for time formatting
	const formatTime = (seconds: number): string => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	};

	// Props for the desktop/mobile game views
	const commonProps: NoteGameViewProps = {
		correctCounter: game.correctCounter,
		totalCounter: game.totalCounter,
		currentTime: game.currentTime,
		startTime: game.startTime,
		scaleAnchorEl,
		octaveAnchorEl,
		openScaleOptions,
		openOctaveOptions,
		handleScaleClick,
		handleOctaveClick,
		handleScaleClose,
		handleOctaveClose,
		chooseScale,
		chooseOctave,
		onAnswer: game.handleButtonClick,
	};

	// Render game over screen
	if (game.gameOver) {
		return (
			<GameOverScreen
				isMobile={isMobile}
				accuracy={game.accuracy}
				npm={game.notesPerMinute}
				onPlayAgain={game.resetGame}
				gameMode={game.gameMode}
				timeLimit={game.timeLimit}
				noteLimit={game.noteLimit}
				timeOptions={TIME_OPTIONS}
				noteOptions={NOTE_OPTIONS}
				scaleChoice={game.scaleChoice}
				octaveChoice={game.octaveChoice}
				onGameModeChange={game.handleGameModeChange}
				onTimeLimitChange={game.handleTimeLimitChange}
				onNoteLimitChange={game.handleNoteLimitChange}
				onScaleChange={chooseScale}
				onOctaveChange={chooseOctave}
				formatTime={formatTime}
			/>
		);
	}

	// Render active game
	return (
		<div onKeyDown={game.handleKeyDown} tabIndex={0}>
			<Fade in={true} timeout={500}>
				<Box
					my={isMobile ? "0" : "2rem"}
					sx={{
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						flexDirection: "column",
						paddingBottom: isMobile ? "140px" : "0",
					}}
				>
					<TopBar
						gameStarted={game.gameStarted}
						gameMode={game.gameMode}
						timeRemaining={game.timeRemaining}
						totalCounter={game.totalCounter}
						noteLimit={game.noteLimit}
						accuracy={game.accuracy}
						formatTime={formatTime}
						timeLimit={game.timeLimit}
						timeOptions={TIME_OPTIONS}
						noteOptions={NOTE_OPTIONS}
						scaleChoice={game.scaleChoice}
						octaveChoice={game.octaveChoice}
						onGameModeChange={game.handleGameModeChange}
						onTimeLimitChange={game.handleTimeLimitChange}
						onNoteLimitChange={game.handleNoteLimitChange}
						onScaleChange={chooseScale}
						onOctaveChange={chooseOctave}
					/>

					{isMobile ? (
						<NoteGameMobileView {...commonProps} />
					) : (
						<NoteGameDesktopView {...commonProps} />
					)}
				</Box>
			</Fade>
		</div>
	);
};

export default NoteGame;

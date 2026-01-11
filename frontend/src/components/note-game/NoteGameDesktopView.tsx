import { Box, Card, Button } from "@mui/material";
import { noteGameStyles } from "../../pages/note-game/NoteGameStyles";
import {
	sharpOptions,
	naturalOptions,
	flatOptions,
} from "../musical/MusicalOptions";
import { NoteGameViewProps } from "./NoteGameViewProps";

const totalOptions = [sharpOptions, naturalOptions, flatOptions];

export const NoteGameDesktopView = ({ onAnswer }: NoteGameViewProps) => {
	return (
		<>
			<Box id="main" sx={noteGameStyles.mainDiv}>
				<Card sx={noteGameStyles.musicContainer}>
					<Box id="sheet-music-div" sx={noteGameStyles.musicDisplay}></Box>
				</Card>
			</Box>
			<Box id="options">
				{totalOptions.map((optionList, index) => (
					<Box key={index} width="100%">
						{optionList.map((option) => (
							<Button
								key={option.value}
								variant="contained"
								sx={{ ...noteGameStyles.answerButtons }}
								onClick={() => onAnswer(option.value)}
							>
								{option.name}
							</Button>
						))}
					</Box>
				))}
			</Box>
		</>
	);
};

import { Box, Card, Button } from "@mui/material";
import { noteGameStyles } from "../../pages/note-game/NoteGameStyles";
import {
	sharpOptions,
	naturalOptions,
	flatOptions,
} from "../musical/MusicalOptions";
import { NoteGameViewProps } from "./NoteGameViewProps";

const totalOptions = [sharpOptions, naturalOptions, flatOptions];

export const NoteGameMobileView = ({ onAnswer }: NoteGameViewProps) => {
	return (
		<>
			<Card sx={noteGameStyles.mobileMusicCard}>
				<Box id="sheet-music-div" sx={noteGameStyles.mobileMusicDisplay}></Box>
			</Card>

			<Box sx={noteGameStyles.mobileAnswerButtonsContainer}>
				{totalOptions.map((optionList, index) => (
					<Box key={index} sx={noteGameStyles.mobileButtonRow}>
						{optionList.map((option) => (
							<Button
								key={option.value}
								variant="contained"
								sx={noteGameStyles.mobileAnswerButton}
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

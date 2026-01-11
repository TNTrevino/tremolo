import { Box, Button } from "@mui/material";
import {
	sharpOptions,
	naturalOptions,
	flatOptions,
} from "../musical/MusicalOptions";

interface AnswerButtonsProps {
	onAnswer: (noteKey: string) => void;
	styles?: object;
}

const totalOptions = [sharpOptions, naturalOptions, flatOptions];

export const AnswerButtons = ({
	onAnswer,
	styles = {},
}: AnswerButtonsProps) => {
	return (
		<>
			{totalOptions.map((optionList, index) => (
				<Box key={index} width="100%" sx={styles}>
					{optionList.map((option) => (
						<Button
							key={option.value}
							variant="contained"
							onClick={() => onAnswer(option.value)}
							sx={{ width: "100%", mb: 1 }}
						>
							{option.name}
						</Button>
					))}
				</Box>
			))}
		</>
	);
};

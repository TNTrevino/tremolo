export interface NoteGameViewProps {
	correctCounter: number;
	totalCounter: number;
	currentTime: number;
	startTime: number;
	scaleAnchorEl: null | HTMLElement;
	octaveAnchorEl: null | HTMLElement;
	openScaleOptions: boolean;
	openOctaveOptions: boolean;
	handleScaleClick: (event: React.MouseEvent<HTMLElement>) => void;
	handleOctaveClick: (event: React.MouseEvent<HTMLElement>) => void;
	handleScaleClose: () => void;
	handleOctaveClose: () => void;
	chooseScale: (scale: string) => void;
	chooseOctave: (octave: string) => void;
	onAnswer: (noteKey: string) => void;
}

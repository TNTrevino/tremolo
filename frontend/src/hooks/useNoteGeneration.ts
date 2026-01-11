import { useState, useCallback, useEffect } from "react";
import { MusicService } from "../services/MusicService";
import { noteGameProps } from "../models/models";
import { noteToSound } from "../pages/note-game/NoteGameUtilities";

interface NoteData {
	noteInformation: noteGameProps;
	sound: string;
}

/**
 * Manages note fetching and sound generation
 * MEDIUM frequency updates - fetches new note after each answer
 * Combines note info and sound in single state to minimize re-renders
 */
export function useNoteGeneration(
	scaleChoice: string,
	octaveChoice: string,
	totalCounter: number,
	gameOver: boolean,
) {
	const [noteData, setNoteData] = useState<NoteData | null>(null);

	// Memoized fetch function
	const fetchNote = useCallback(async (): Promise<void> => {
		if (gameOver) return;

		try {
			const noteInfo = await MusicService.getNoteGameXml(
				scaleChoice,
				octaveChoice,
			);
			const sound = noteToSound[noteInfo.fullNoteName];

			// Single state update to avoid multiple re-renders
			setNoteData({ noteInformation: noteInfo, sound });
		} catch (error) {
			console.error("Failed to fetch note:", error);
		}
	}, [scaleChoice, octaveChoice, gameOver]);

	// Fetch note when dependencies change
	useEffect(() => {
		fetchNote();
	}, [scaleChoice, octaveChoice, totalCounter, fetchNote]);

	return {
		noteInformation: noteData?.noteInformation,
		sound: noteData?.sound,
		fetchNote,
	};
}

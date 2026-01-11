import axios from "axios";
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import {
	generatedMusicProps,
	rhythmMusicProps,
	noteGameProps,
	NoteGameDTO,
} from "../models/models";

const baseUrl = import.meta.env.VITE_BACKEND_MUSIC;

export const MusicService = {
	async getMaryMusic({ scale, octave }: generatedMusicProps): Promise<void> {
		try {
			const response = await axios.post<string>(
				`${baseUrl}/mary`,
				{ tonic: scale, octave: octave },
				{ responseType: "text" },
			);

			const generatedXml = response.data;
			const sheetMusicContainer = document.getElementById("sheet-music-div");

			if (!sheetMusicContainer) {
				console.error("Could not find the sheet music container");
				return;
			}

			const osmd = new OpenSheetMusicDisplay(
				sheetMusicContainer as HTMLElement,
			);

			await osmd.load(generatedXml);
			osmd.render();
		} catch (error) {
			console.error("Did not get sheet music", error);
		}
	},

	async getRhythmMusic({
		scale,
		octave,
		rhythmType,
		rhythm,
	}: rhythmMusicProps): Promise<void> {
		try {
			const response = await axios.post<string>(
				`${baseUrl}/random`,
				{ tonic: scale + octave, rhythmType: rhythmType, rhythm: rhythm },
				{ responseType: "text" },
			);

			const generatedXml = response.data;
			const sheetMusicContainer = document.getElementById("sheet-music-div");

			if (!sheetMusicContainer) {
				console.error("Could not find the sheet music container");
				return;
			}

			const osmd = new OpenSheetMusicDisplay(
				sheetMusicContainer as HTMLElement,
			);

			await osmd.load(generatedXml);
			osmd.render();
		} catch (error) {
			console.error("Did not get sheet music", error);
		}
	},

	async displayXml(selectedFiles: FileList | null): Promise<void> {
		const sheetMusicContainer = document.getElementById("sheet-music-div");

		if (!selectedFiles) {
			console.error("Files were not uploaded correctly");
			return;
		}

		if (selectedFiles.length > 1) {
			alert("Currently, only one file at a time is supported");
			return;
		}

		const fileToConvert = selectedFiles[0];

		if (!sheetMusicContainer) {
			console.error(
				"could not find the sheet music container. should be 'sheet-music-div'.",
			);
			return;
		}

		const osmd = new OpenSheetMusicDisplay(sheetMusicContainer as HTMLElement);

		if (!fileToConvert) {
			console.error("an error occurred rendering the sheet music.");
			return;
		}

		try {
			const filesAsXml = await this.readFileAsText(fileToConvert);
			await osmd.load(filesAsXml);
			osmd.render();
		} catch (error) {
			console.error("Error rendering sheet music", error);
		}
	},

	readFileAsText(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = () => reject(reader.error);
			reader.readAsText(file);
		});
	},

	// TODO:
	// from the backend: return the note name with either the name or value option
	// (see the options from musical options)
	// and if is correct, make the elevation green, if wrong, make it bl async getNoteGameXml(
	async getNoteGameXml(scale: string, octave: string): Promise<noteGameProps> {
		try {
			const response = await axios.post<NoteGameDTO>(
				`${baseUrl}/note-game`,
				{ scale: scale, octave: octave },
				{ responseType: "json" },
			);

			const generatedXml = response.data.generatedXml;
			const noteName = response.data.noteName;
			const noteOctave = response.data.noteOctave;

			const sheetMusicContainer = document.getElementById("sheet-music-div");

			if (!sheetMusicContainer) {
				throw new Error("Could not find the sheet music container");
			}

			const osmd = new OpenSheetMusicDisplay(
				sheetMusicContainer as HTMLElement,
			);

			// alert(`${noteName} ${noteOctave}`);

			await osmd.load(generatedXml);
			osmd.render();

			const noteInformation: noteGameProps = {
				noteName: noteName,
				octave: noteOctave,
				fullNoteName: noteName + noteOctave,
			};

			return noteInformation;
		} catch (error) {
			throw new Error(
				`did not get sheet music, params: scale: ${scale}, octave: ${octave}. Error: ${error}`,
			);
		}
	},
};

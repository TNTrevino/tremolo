import type { KeyBindings } from "@/services/api/types";

export function keyBindingsToNoteMap(kb: KeyBindings): Record<string, string> {
	return {
		C: kb.key_c,
		"C#": kb.key_c_sharp,
		Cb: kb.key_c_flat,
		D: kb.key_d,
		"D#": kb.key_d_sharp,
		Db: kb.key_d_flat,
		E: kb.key_e,
		"E#": kb.key_e_sharp,
		Eb: kb.key_e_flat,
		F: kb.key_f,
		"F#": kb.key_f_sharp,
		Fb: kb.key_f_flat,
		G: kb.key_g,
		"G#": kb.key_g_sharp,
		Gb: kb.key_g_flat,
		A: kb.key_a,
		"A#": kb.key_a_sharp,
		Ab: kb.key_a_flat,
		B: kb.key_b,
		"B#": kb.key_b_sharp,
		Bb: kb.key_b_flat,
	};
}

export function formatTimeLength(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	return [hours, minutes, secs]
		.map((val) => String(val).padStart(2, "0"))
		.join(":");
}

export function calculateNPM(
	correctQuestions: number,
	timeInSeconds: number,
): number {
	if (timeInSeconds === 0) return 0;

	const minutes = timeInSeconds / 60;
	const npm = correctQuestions / minutes;

	return Math.round(npm);
}

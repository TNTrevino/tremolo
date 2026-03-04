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

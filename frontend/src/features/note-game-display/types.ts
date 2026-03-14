/**
 * Configuration options for the NoteGameDisplay class.
 *
 * This is the only configuration surface for consumers of NoteGameDisplay.
 * All fields except `container` are optional and have sensible defaults.
 *
 * Container dimensions are read dynamically from the DOM element at render
 * time, so sizing is controlled purely through CSS on the container.
 */
export interface NoteGameDisplayOptions {
	/** The DOM element OSMD will render into. */
	container: HTMLElement;

	/** OSMD zoom level for single-note rendering. Defaults to ~2.0. */
	zoom?: number;

	/** Whether to render in dark mode. Sets note color to white when true, black when false. */
	darkMode?: boolean;

	/** Padding around the viewBox crop in pixels. */
	padding?: number;
}

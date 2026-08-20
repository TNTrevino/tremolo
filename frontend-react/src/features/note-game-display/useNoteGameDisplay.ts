import { useRef, useState, useCallback, useEffect } from "react";
import { NoteGameDisplay } from "./NoteGameDisplay";

export interface UseNoteGameDisplayOptions {
	zoom?: number;
	darkMode?: boolean;
	padding?: number;
}

export interface UseNoteGameDisplayReturn {
	containerRef: React.RefObject<HTMLDivElement>;
	loadNote: (musicXml: string) => Promise<void>;
	refresh: () => void;
	clear: () => void;
	isReady: boolean;
}

/**
 * React hook that wraps the NoteGameDisplay class for clean React integration.
 *
 * Attach the returned `containerRef` to a `<div>` element as a ref.
 * The hook handles creating and destroying the underlying NoteGameDisplay
 * instance tied to the component lifecycle.
 *
 * OSMD initialization is done inside a useEffect so that cleanup and
 * re-initialization work correctly under React StrictMode's
 * mount-unmount-remount cycle.
 *
 * @param options - Optional configuration for zoom, dark mode, and padding.
 * @returns Controls and state for the note game display.
 */
export function useNoteGameDisplay(
	options?: UseNoteGameDisplayOptions,
): UseNoteGameDisplayReturn {
	const instanceRef = useRef<NoteGameDisplay | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [isReady, setIsReady] = useState(false);

	const zoom = options?.zoom;
	const darkMode = options?.darkMode;
	const padding = options?.padding;

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		instanceRef.current = new NoteGameDisplay({
			container,
			zoom,
			darkMode,
			padding,
		});

		let cancelled = false;
		queueMicrotask(() => {
			if (!cancelled) setIsReady(true);
		});

		return () => {
			cancelled = true;
			instanceRef.current?.destroy();
			instanceRef.current = null;
			setIsReady(false);
		};
		// darkMode is handled by the separate effect below so that toggling
		// the theme re-colors the existing OSMD instance instead of tearing
		// it down (which would reset the note queue and lose the current note).
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [zoom, padding]);

	useEffect(() => {
		instanceRef.current?.setDarkMode(darkMode ?? false);
	}, [darkMode]);

	const loadNote = useCallback(async (musicXml: string) => {
		if (!instanceRef.current) return;
		await instanceRef.current.loadNote(musicXml);
	}, []);

	const refresh = useCallback(() => {
		instanceRef.current?.refresh();
	}, []);

	const clear = useCallback(() => {
		instanceRef.current?.clear();
	}, []);

	return { containerRef, loadNote, refresh, clear, isReady };
}

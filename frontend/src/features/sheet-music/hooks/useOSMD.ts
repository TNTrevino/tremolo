import { useRef, useState, useCallback, useEffect } from "react";
import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import { logger } from "@/lib/logger";

export interface UseOSMDOptions {
	/**
	 * Container element ID to render the sheet music in
	 * If not provided, you must pass a ref to the container element
	 */
	containerId?: string;
	/**
	 * Callback when rendering completes successfully
	 */
	onRenderComplete?: () => void;
	/**
	 * Callback when an error occurs
	 */
	onError?: (error: Error) => void;
}

export interface UseOSMDReturn {
	/**
	 * Load and render MusicXML string
	 */
	loadAndRender: (musicXml: string) => Promise<void>;
	/**
	 * Clear the current sheet music display
	 */
	clear: () => void;
	/**
	 * Whether the sheet music is currently loading
	 */
	isLoading: boolean;
	/**
	 * Error state if loading/rendering failed
	 */
	error: Error | null;
	/**
	 * Reference to the OSMD instance (for advanced usage)
	 */
	osmdInstance: OpenSheetMusicDisplay | null;
	/**
	 * Ref to attach to the container element (if not using containerId)
	 */
	containerRef: React.RefObject<HTMLDivElement>;
}

/**
 * Custom hook for managing OpenSheetMusicDisplay (OSMD) instance lifecycle
 *
 * Handles initialization, XML loading, rendering, and cleanup of OSMD.
 * Supports both element ID and ref-based container selection.
 *
 * @example
 * // Using container ID
 * const { loadAndRender, isLoading, error } = useOSMD({ containerId: 'sheet-music-div' });
 *
 * @example
 * // Using container ref
 * const { loadAndRender, containerRef, isLoading } = useOSMD();
 * return <div ref={containerRef} />;
 */
export function useOSMD(options?: UseOSMDOptions): UseOSMDReturn {
	const { containerId, onRenderComplete, onError } = options || {};

	// State management
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	// Refs
	const containerRef = useRef<HTMLDivElement>(null);
	const osmdInstanceRef = useRef<OpenSheetMusicDisplay | null>(null);

	/**
	 * Get the container element (either by ID or ref)
	 */
	const getContainer = useCallback((): HTMLElement | null => {
		if (containerId) {
			return document.getElementById(containerId);
		}
		return containerRef.current;
	}, [containerId]);

	/**
	 * Initialize OSMD instance if needed
	 */
	const initializeOSMD = useCallback((): OpenSheetMusicDisplay | null => {
		const container = getContainer();

		if (!container) {
			const error = new Error(
				containerId
					? `Could not find sheet music container with ID: ${containerId}`
					: "Container ref is not attached to an element",
			);
			setError(error);
			onError?.(error);
			return null;
		}

		// Clean up existing instance if any
		if (osmdInstanceRef.current) {
			osmdInstanceRef.current.clear();
		}

		// Create new OSMD instance
		try {
			const osmd = new OpenSheetMusicDisplay(container);
			osmdInstanceRef.current = osmd;
			return osmd;
		} catch (err) {
			const error =
				err instanceof Error
					? err
					: new Error("Failed to initialize OpenSheetMusicDisplay");
			setError(error);
			onError?.(error);
			return null;
		}
	}, [getContainer, containerId, onError]);

	/**
	 * Load and render MusicXML string
	 */
	const loadAndRender = useCallback(
		(musicXml: string) => {
			setIsLoading(true);
			setError(null);

			const osmd = osmdInstanceRef.current || initializeOSMD();

			if (!osmd) {
				const error = new Error("Failed to initialize OSMD instance");
				setError(error);
				onError?.(error);
				setIsLoading(false);
				return Promise.resolve();
			}

			return osmd
				.load(musicXml)
				.then(() => {
					osmd.render();
					onRenderComplete?.();
				})
				.catch((err) => {
					logger.error("Failed to render sheet music", err);
					const error =
						err instanceof Error
							? err
							: new Error("Failed to render sheet music");
					setError(error);
					onError?.(error);
				})
				.finally(() => {
					setIsLoading(false);
				});
		},
		[initializeOSMD, onRenderComplete, onError],
	);

	/**
	 * Clear the current sheet music display
	 */
	const clear = useCallback(() => {
		if (osmdInstanceRef.current) {
			try {
				osmdInstanceRef.current.clear();
			} catch (err) {
				logger.error("Failed to clear OSMD", err);
			}
		}
		setError(null);
	}, []);

	/**
	 * Cleanup on unmount
	 */
	useEffect(() => {
		return () => {
			if (osmdInstanceRef.current) {
				try {
					osmdInstanceRef.current.clear();
				} catch (err) {
					logger.error("Failed to clean up OSMD on unmount", err);
				}
				osmdInstanceRef.current = null;
			}
		};
	}, []);

	return {
		loadAndRender,
		clear,
		isLoading,
		error,
		osmdInstance: osmdInstanceRef.current,
		containerRef,
	};
}

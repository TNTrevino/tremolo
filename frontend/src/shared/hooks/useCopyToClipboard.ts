import { useState } from "react";

const RESET_DELAY_MS = 1500;

/**
 * Copies text to the clipboard and exposes a transient `copied` flag
 * (reset after 1.5s) so callers can swap an icon/label to confirm the
 * copy happened.
 */
export function useCopyToClipboard() {
	const [copied, setCopied] = useState(false);

	async function copy(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), RESET_DELAY_MS);
		} catch {
			// Clipboard access can fail (permissions, insecure context); silently
			// no-op — the code is still visible for the teacher to read aloud.
		}
	}

	return { copied, copy };
}

/**
 * Validates that a string matches the expected HSL format: "<H> <S>% <L>%"
 * where H is 0-360, S is 0-100, L is 0-100.
 */
export function isValidHslString(hsl: string): boolean {
	const match = hsl.match(
		/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/,
	);
	if (!match) return false;

	const h = parseFloat(match[1]!);
	const s = parseFloat(match[2]!);
	const l = parseFloat(match[3]!);

	return h >= 0 && h <= 360 && s >= 0 && s <= 100 && l >= 0 && l <= 100;
}

/**
 * Converts a space-separated HSL string like "262 83% 58%" to a hex color
 * like "#7c3aed".
 */
export function hslStringToHex(hsl: string): string {
	const match = hsl.match(
		/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/,
	);
	if (!match) {
		throw new Error(`Invalid HSL string: "${hsl}"`);
	}

	const h = parseFloat(match[1]!);
	const s = parseFloat(match[2]!) / 100;
	const l = parseFloat(match[3]!) / 100;

	const chroma = (1 - Math.abs(2 * l - 1)) * s;
	const hueSegment = h / 60;
	const x = chroma * (1 - Math.abs((hueSegment % 2) - 1));
	const m = l - chroma / 2;

	let r1 = 0,
		g1 = 0,
		b1 = 0;

	if (hueSegment >= 0 && hueSegment < 1) {
		r1 = chroma;
		g1 = x;
	} else if (hueSegment >= 1 && hueSegment < 2) {
		r1 = x;
		g1 = chroma;
	} else if (hueSegment >= 2 && hueSegment < 3) {
		g1 = chroma;
		b1 = x;
	} else if (hueSegment >= 3 && hueSegment < 4) {
		g1 = x;
		b1 = chroma;
	} else if (hueSegment >= 4 && hueSegment < 5) {
		r1 = x;
		b1 = chroma;
	} else if (hueSegment >= 5 && hueSegment <= 6) {
		r1 = chroma;
		b1 = x;
	}

	const r = Math.round((r1 + m) * 255);
	const g = Math.round((g1 + m) * 255);
	const b = Math.round((b1 + m) * 255);

	const toHex = (n: number) => n.toString(16).padStart(2, "0");
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Converts a hex color like "#7c3aed" to a space-separated HSL string
 * like "262 83% 58%".
 *
 * H is rounded to the nearest integer.
 * S and L are rounded to 1 decimal place (trailing ".0" is dropped for
 * whole-number values).
 */
export function hexToHslString(hex: string): string {
	const cleaned = hex.replace(/^#/, "");
	if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) {
		throw new Error(`Invalid hex color: "${hex}"`);
	}

	const r = parseInt(cleaned.slice(0, 2), 16) / 255;
	const g = parseInt(cleaned.slice(2, 4), 16) / 255;
	const b = parseInt(cleaned.slice(4, 6), 16) / 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const delta = max - min;

	const l = (max + min) / 2;

	let h = 0;
	let s = 0;

	if (delta !== 0) {
		s = delta / (1 - Math.abs(2 * l - 1));

		if (max === r) {
			h = 60 * (((g - b) / delta) % 6);
		} else if (max === g) {
			h = 60 * ((b - r) / delta + 2);
		} else {
			h = 60 * ((r - g) / delta + 4);
		}

		if (h < 0) h += 360;
	}

	const hRounded = Math.round(h);
	const sRounded = Math.round(s * 1000) / 10;
	const lRounded = Math.round(l * 1000) / 10;

	const fmt = (n: number) =>
		Number.isInteger(n) ? n.toString() : n.toFixed(1);

	return `${hRounded} ${fmt(sRounded)}% ${fmt(lRounded)}%`;
}

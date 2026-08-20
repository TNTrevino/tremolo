export interface KeySignatureGlyphProps {
	/** Fifths count: negative = flats, 0 = no accidentals, positive = sharps */
	fifths: number;
	className?: string;
}

/** Human-readable name for a fifths count (used for aria labels). */
export function keySignatureName(fifths: number): string {
	if (fifths === 0) return "no accidentals";
	const kind = fifths > 0 ? "sharp" : "flat";
	const count = Math.abs(fifths);
	return `${count} ${kind}${count > 1 ? "s" : ""}`;
}

/**
 * Renders a key signature as its accidental glyphs (♭♭♭ / ♯♯♯) with the
 * staggered baseline of a real staff, instead of a text label like
 * "3♭". Reusable by any game with a key-signature setting.
 */
export function KeySignatureGlyph({
	fifths,
	className = "",
}: KeySignatureGlyphProps) {
	if (fifths === 0) {
		return (
			<span aria-label={keySignatureName(0)} className={className}>
				{"♮"}
			</span>
		);
	}

	const symbol = fifths > 0 ? "♯" : "♭";
	const count = Math.abs(fifths);

	return (
		<span
			aria-label={keySignatureName(fifths)}
			className={`inline-flex items-center leading-none ${className}`}
		>
			{Array.from({ length: count }, (_, i) => (
				<span
					key={i}
					aria-hidden="true"
					className={i > 0 ? "-ml-0.5" : undefined}
					style={{
						transform: `translateY(${i % 2 === 0 ? "0.12em" : "-0.18em"})`,
					}}
				>
					{symbol}
				</span>
			))}
		</span>
	);
}

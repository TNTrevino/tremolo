import type { StaffClef } from "@/services/api/types";

export const CLEF_LABELS: Record<StaffClef, string> = {
	treble: "Treble Clef",
	bass: "Bass Clef",
	alto: "Alto Clef",
	tenor: "Tenor Clef",
	soprano: "Soprano Clef",
	mezzo_soprano: "Mezzo-soprano Clef",
	baritone: "Baritone Clef",
};

/** Unicode codepoint per clef (shared by other staff renderers). */
export const CLEF_UNICODE: Record<StaffClef, string> = {
	treble: "\u{1D11E}",
	bass: "\u{1D122}",
	alto: "\u{1D121}",
	tenor: "\u{1D121}",
	soprano: "\u{1D121}",
	mezzo_soprano: "\u{1D121}",
	baritone: "\u{1D122}",
};

// Which staff line (0 = bottom) each clef centers on, plus a per-glyph
// font size (the three glyphs have very different metrics).
const GLYPHS: Record<StaffClef, { line: number; fontSize: number }> = {
	treble: { line: 2, fontSize: 30 },
	bass: { line: 3, fontSize: 22 },
	alto: { line: 2, fontSize: 24 },
	tenor: { line: 3, fontSize: 24 },
	soprano: { line: 0, fontSize: 24 },
	mezzo_soprano: { line: 1, fontSize: 24 },
	baritone: { line: 2, fontSize: 22 },
};

const LINE_SPACING = 6;
const STAFF_TOP = 10;
const WIDTH = 46;
const HEIGHT = 48;

export interface ClefGlyphProps {
	clef: StaffClef;
	className?: string;
}

/**
 * A clef on a mini five-line staff, for settings chips and pickers.
 * Reusable by any game with a clef setting.
 */
export function ClefGlyph({ clef, className = "" }: ClefGlyphProps) {
	const { line, fontSize } = GLYPHS[clef];
	const glyph = CLEF_UNICODE[clef];
	const lineY = (index: number) => STAFF_TOP + (4 - index) * LINE_SPACING;

	return (
		<svg
			viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
			width={WIDTH}
			height={HEIGHT}
			className={className}
			role="img"
			aria-label={CLEF_LABELS[clef]}
		>
			{[0, 1, 2, 3, 4].map((i) => (
				<line
					key={i}
					x1={4}
					x2={WIDTH - 4}
					y1={lineY(i)}
					y2={lineY(i)}
					stroke="currentColor"
					strokeWidth={1}
				/>
			))}
			<text
				x={WIDTH / 2}
				y={lineY(line)}
				fontSize={fontSize}
				fill="currentColor"
				textAnchor="middle"
				dominantBaseline="central"
			>
				{glyph}
			</text>
		</svg>
	);
}

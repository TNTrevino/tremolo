/**
 * Renders a rhythm digit pattern (the /music/random encoding) as real
 * notation: beamed noteheads, partial sixteenth beams, flags on
 * isolated notes, and rest glyphs. Draws with currentColor so it works
 * on any button state.
 *
 * Encoding (one beat): rhythmType 16 — "0" sixteenth rest, "1"
 * sixteenth note, "2" eighth note; rhythmType 8 — "0" eighth rest,
 * "1" eighth note.
 */

export interface RhythmGlyphProps {
	/** Digit pattern, e.g. "1111", "0111", "10" */
	rhythm: string;
	rhythmType: 8 | 16;
	className?: string;
}

interface RhythmEvent {
	/** Duration in sixteenth units */
	units: number;
	isRest: boolean;
	/** Beams this note needs: 1 = eighth, 2 = sixteenth */
	beams: number;
}

function parse(rhythm: string, rhythmType: 8 | 16): RhythmEvent[] {
	return [...rhythm].map((digit) => {
		if (rhythmType === 16) {
			if (digit === "2") return { units: 2, isRest: false, beams: 1 };
			return { units: 1, isRest: digit === "0", beams: 2 };
		}
		return { units: 2, isRest: digit === "0", beams: 1 };
	});
}

/** Human-readable name, used for aria labels on the buttons. */
export function describeRhythm(rhythm: string, rhythmType: 8 | 16): string {
	return parse(rhythm, rhythmType)
		.map((event) => {
			const name = event.units === 1 ? "sixteenth" : "eighth";
			return event.isRest ? `${name} rest` : `${name} note`;
		})
		.join(", ");
}

// Geometry (viewBox units). One sixteenth of horizontal time = UNIT_W.
const UNIT_W = 13;
const PAD_LEFT = 7;
const PAD_RIGHT = 12;
const HEIGHT = 44;
const HEAD_Y = 34; // notehead center
const BEAM_Y = 8; // primary beam top
const BEAM_GAP = 5.5; // distance to the sixteenth beam
const BEAM_H = 3.2;
const STEM_DX = 4.1; // stem offset from notehead center
const STUB_W = 8;

const REST_GLYPHS: Record<number, string> = {
	1: "\u{1D13F}", // sixteenth rest
	2: "\u{1D13E}", // eighth rest
};

export function RhythmGlyph({
	rhythm,
	rhythmType,
	className = "h-9 w-auto",
}: RhythmGlyphProps) {
	const events = parse(rhythm, rhythmType);
	const totalUnits = events.reduce((sum, e) => sum + e.units, 0);
	const width = PAD_LEFT + totalUnits * UNIT_W + PAD_RIGHT;

	// x position (notehead center) per event, proportional to duration
	let cursor = PAD_LEFT;
	const xs = events.map((event) => {
		const x = cursor + 3;
		cursor += event.units * UNIT_W;
		return x;
	});

	// Beam groups: runs of consecutive notes (rests break beams)
	const groups: number[][] = [];
	let run: number[] = [];
	events.forEach((event, i) => {
		if (event.isRest) {
			if (run.length) groups.push(run);
			run = [];
		} else {
			run.push(i);
		}
	});
	if (run.length) groups.push(run);

	const shapes: React.ReactNode[] = [];

	for (const group of groups) {
		const beamed = group.length >= 2;

		for (const i of group) {
			const x = xs[i]!;
			// Notehead
			shapes.push(
				<ellipse
					key={`head-${i}`}
					cx={x}
					cy={HEAD_Y}
					rx={4.4}
					ry={3.1}
					transform={`rotate(-20 ${x} ${HEAD_Y})`}
					fill="currentColor"
				/>,
			);
			// Stem
			const stemTop = beamed ? BEAM_Y : HEAD_Y - 22;
			shapes.push(
				<line
					key={`stem-${i}`}
					x1={x + STEM_DX}
					x2={x + STEM_DX}
					y1={HEAD_Y - 1}
					y2={stemTop}
					stroke="currentColor"
					strokeWidth={1.4}
				/>,
			);
			// Flags for isolated notes
			if (!beamed) {
				const flags = events[i]!.beams;
				for (let f = 0; f < flags; f++) {
					const y = stemTop + f * 6;
					shapes.push(
						<path
							key={`flag-${i}-${f}`}
							d={`M ${x + STEM_DX} ${y} c 7 3, 8 8, 3.5 14`}
							stroke="currentColor"
							strokeWidth={2.4}
							fill="none"
							strokeLinecap="round"
						/>,
					);
				}
			}
		}

		if (!beamed) continue;

		// Primary (eighth) beam across the whole group
		const first = group[0]!;
		const last = group[group.length - 1]!;
		const beamX1 = xs[first]! + STEM_DX - 0.7;
		const beamX2 = xs[last]! + STEM_DX + 0.7;
		shapes.push(
			<rect
				key={`beam1-${first}`}
				x={beamX1}
				y={BEAM_Y}
				width={beamX2 - beamX1}
				height={BEAM_H}
				fill="currentColor"
			/>,
		);

		// Sixteenth beam: full segments between adjacent sixteenths,
		// partial stubs for a sixteenth next to an eighth
		const covered = new Set<number>();
		for (let g = 0; g < group.length - 1; g++) {
			const a = group[g]!;
			const b = group[g + 1]!;
			if (events[a]!.beams === 2 && events[b]!.beams === 2) {
				shapes.push(
					<rect
						key={`beam2-${a}`}
						x={xs[a]! + STEM_DX - 0.7}
						y={BEAM_Y + BEAM_GAP}
						width={xs[b]! - xs[a]! + 1.4}
						height={BEAM_H}
						fill="currentColor"
					/>,
				);
				covered.add(a);
				covered.add(b);
			}
		}
		for (const i of group) {
			if (events[i]!.beams !== 2 || covered.has(i)) continue;
			// Stub points inward: left when the note has a group
			// neighbor before it, right when it opens the group
			const towardLeft = i !== group[0];
			const stemX = xs[i]! + STEM_DX;
			shapes.push(
				<rect
					key={`stub-${i}`}
					x={towardLeft ? stemX - STUB_W : stemX - 0.7}
					y={BEAM_Y + BEAM_GAP}
					width={STUB_W}
					height={BEAM_H}
					fill="currentColor"
				/>,
			);
		}
	}

	// Rests
	events.forEach((event, i) => {
		if (!event.isRest) return;
		shapes.push(
			<text
				key={`rest-${i}`}
				x={xs[i]!}
				y={HEAD_Y - 8}
				fontSize={26}
				fill="currentColor"
				textAnchor="middle"
				dominantBaseline="central"
			>
				{REST_GLYPHS[event.units]}
			</text>,
		);
	});

	return (
		<svg
			viewBox={`0 0 ${width} ${HEIGHT}`}
			className={className}
			role="img"
			aria-label={describeRhythm(rhythm, rhythmType)}
		>
			{shapes}
		</svg>
	);
}

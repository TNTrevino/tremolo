import { useCallback, useRef } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import type { RangeClef } from "@/services/api/types";
import { CLEF_UNICODE } from "@/features/identification-game";
import {
	noteToIndex,
	indexToNote,
	staffSteps,
	ledgerSteps,
	BOTTOM_LINE_INDEX,
	RANGE_BOUNDS,
} from "../rangeUtils";

export interface StaffRangePickerProps {
	clef: RangeClef;
	/** Low endpoint, natural note (e.g. "C4") */
	low: string;
	/** High endpoint, natural note (e.g. "C6") */
	high: string;
	onChange: (low: string, high: string) => void;
}

// SVG geometry: one staff-position step is half the line spacing.
const LINE_SPACING = 14;
const STEP = LINE_SPACING / 2;
const STAFF_TOP = 56; // y of the top staff line
const STAFF_LEFT = 44;
const STAFF_WIDTH = 168;
const HEIGHT = 168;
const WIDTH = STAFF_LEFT + STAFF_WIDTH + 8;
const LOW_X = STAFF_LEFT + 46;
const HIGH_X = STAFF_LEFT + 122;

const CLEF_GLYPHS: Record<RangeClef, { glyph: string; dy: number }> = {
	// Codepoints shared with ClefGlyph; dy positions at this scale.
	treble: { glyph: CLEF_UNICODE.treble, dy: 3.1 * LINE_SPACING },
	bass: { glyph: CLEF_UNICODE.bass, dy: 1.05 * LINE_SPACING },
};

/** y coordinate of a staff-position step (0 = bottom line). */
function stepToY(steps: number): number {
	return STAFF_TOP + 4 * LINE_SPACING - steps * STEP;
}

function WholeNote({
	index,
	clef,
	x,
	onPointerDown,
}: {
	index: number;
	clef: RangeClef;
	x: number;
	onPointerDown: (e: React.PointerEvent) => void;
}) {
	const y = stepToY(staffSteps(index, clef));
	return (
		<g
			onPointerDown={onPointerDown}
			className="cursor-grab touch-none"
			role="presentation"
		>
			{ledgerSteps(index, clef).map((s) => (
				<line
					key={s}
					x1={x - 13}
					x2={x + 13}
					y1={stepToY(s)}
					y2={stepToY(s)}
					stroke="currentColor"
					strokeWidth={1.5}
				/>
			))}
			{/* invisible hit area so grabbing is easy */}
			<rect x={x - 16} y={y - 16} width={32} height={32} fill="transparent" />
			<ellipse
				cx={x}
				cy={y}
				rx={8.5}
				ry={5.5}
				fill="currentColor"
				transform={`rotate(-14 ${x} ${y})`}
			/>
			<ellipse
				cx={x}
				cy={y}
				rx={4.6}
				ry={3}
				className="fill-card"
				transform={`rotate(24 ${x} ${y})`}
			/>
		</g>
	);
}

/**
 * Staff-based note range selector.
 *
 * Renders a mini staff with the low and high range endpoints as whole
 * notes. Endpoints move by one staff position via the chevron buttons
 * or by dragging the note heads. Endpoints are natural notes.
 */
export function StaffRangePicker({
	clef,
	low,
	high,
	onChange,
}: StaffRangePickerProps) {
	const svgRef = useRef<SVGSVGElement>(null);
	const dragRef = useRef<"low" | "high" | null>(null);

	const lowIdx = noteToIndex(low);
	const highIdx = noteToIndex(high);
	const bounds = RANGE_BOUNDS[clef];

	const moveEndpoint = useCallback(
		(which: "low" | "high", targetIdx: number) => {
			if (which === "low") {
				const next = Math.max(bounds.min, Math.min(targetIdx, highIdx - 1));
				if (next !== lowIdx) onChange(indexToNote(next), high);
			} else {
				const next = Math.min(bounds.max, Math.max(targetIdx, lowIdx + 1));
				if (next !== highIdx) onChange(low, indexToNote(next));
			}
		},
		[bounds, lowIdx, highIdx, low, high, onChange],
	);

	const yToIndex = useCallback(
		(clientY: number): number => {
			const svg = svgRef.current;
			if (!svg) return 0;
			const rect = svg.getBoundingClientRect();
			const y = ((clientY - rect.top) / rect.height) * HEIGHT;
			const steps = Math.round((STAFF_TOP + 4 * LINE_SPACING - y) / STEP);
			return steps + BOTTOM_LINE_INDEX[clef];
		},
		[clef],
	);

	const handlePointerDown = useCallback(
		(which: "low" | "high") => (e: React.PointerEvent) => {
			dragRef.current = which;
			(e.target as Element).setPointerCapture?.(e.pointerId);
		},
		[],
	);

	const handlePointerMove = useCallback(
		(e: React.PointerEvent) => {
			if (!dragRef.current) return;
			moveEndpoint(dragRef.current, yToIndex(e.clientY));
		},
		[moveEndpoint, yToIndex],
	);

	const handlePointerUp = useCallback(() => {
		dragRef.current = null;
	}, []);

	const stepper = (which: "low" | "high", idx: number) => (
		<div className="flex flex-col gap-1">
			<Button
				type="button"
				size="sm"
				variant="outline"
				className="h-7 w-7 p-0"
				aria-label={`${which === "low" ? "Lowest" : "Highest"} note up`}
				onClick={() => moveEndpoint(which, idx + 1)}
			>
				<ChevronUp className="h-4 w-4" />
			</Button>
			<Button
				type="button"
				size="sm"
				variant="outline"
				className="h-7 w-7 p-0"
				aria-label={`${which === "low" ? "Lowest" : "Highest"} note down`}
				onClick={() => moveEndpoint(which, idx - 1)}
			>
				<ChevronDown className="h-4 w-4" />
			</Button>
		</div>
	);

	const clefGlyph = CLEF_GLYPHS[clef];

	return (
		<div className="flex items-center gap-2">
			{stepper("low", lowIdx)}
			<svg
				ref={svgRef}
				viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
				className="w-56 text-foreground select-none"
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onPointerLeave={handlePointerUp}
				aria-label={`Note range from ${low} to ${high}`}
				role="img"
			>
				{[0, 1, 2, 3, 4].map((line) => (
					<line
						key={line}
						x1={STAFF_LEFT - 30}
						x2={STAFF_LEFT + STAFF_WIDTH}
						y1={STAFF_TOP + line * LINE_SPACING}
						y2={STAFF_TOP + line * LINE_SPACING}
						stroke="currentColor"
						strokeWidth={1.2}
					/>
				))}
				<text
					x={STAFF_LEFT - 28}
					y={STAFF_TOP + clefGlyph.dy}
					fontSize={LINE_SPACING * 3.4}
					fill="currentColor"
				>
					{clefGlyph.glyph}
				</text>
				<WholeNote
					index={lowIdx}
					clef={clef}
					x={LOW_X}
					onPointerDown={handlePointerDown("low")}
				/>
				<WholeNote
					index={highIdx}
					clef={clef}
					x={HIGH_X}
					onPointerDown={handlePointerDown("high")}
				/>
			</svg>
			{stepper("high", highIdx)}
		</div>
	);
}

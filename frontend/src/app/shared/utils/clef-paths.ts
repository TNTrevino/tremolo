/**
 * Drawn clefs for the two hand-rendered staves.
 *
 * **A clef is a path here, not a character.** Both staves used to render
 * `CLEF_UNICODE` as SVG `<text>` at `3.4 × LINE_SPACING`, and the size of
 * U+1D11E depends entirely on whichever font on the reader's machine answers
 * for the Musical Symbols block. In practice it came out near a third of
 * engraving scale, so the clef sat as a small mark beside the staff instead
 * of on it. Nothing about the *anchor* was wrong -- the old `dy` values
 * already put the glyph's origin on the right line -- so this module changes
 * only where the size comes from.
 *
 * The outlines are Vexflow's Gonville clefs (glyphs `v83` and `v79`,
 * `vexflow/src/fonts/gonville_all.js`), converted from Vexflow's own outline
 * notation to SVG path data: `m`/`l` map straight across, `b` reorders to
 * SVG's control-points-first `C`, and every y is negated because font units
 * run upward.
 *
 * Two numbers make the placement work:
 *
 * - Gonville draws at **365.5 font units per staff space**, which is
 *   `resolution × 100 × STAVE_LINE_DISTANCE / (clef point size × 72)` =
 *   `1000 × 100 × 10 / (38 × 72)`.
 * - Each glyph's origin sits **on the line the clef names**: the G line for
 *   treble, the F line for bass. `line` below is that line's index counted
 *   from the top, so a translate to the line plus a uniform scale is the
 *   whole transform.
 *
 * At this scale a treble clef stands 6.5 staff spaces tall against a
 * four-space staff. It is meant to overhang the top line and hang its tail
 * below the bottom one; that is engraving, not a bug.
 *
 * Only treble and bass live here, which is exactly `RangeClef`. The
 * identification games draw their seven clefs through OSMD or the
 * `CLEF_UNICODE` icon, and neither needs a path.
 */

import type { RangeClef } from "../models/music.models";

/** Font units per staff space in the Gonville outlines. */
export const CLEF_UNITS_PER_SPACE = 365.5;

export interface ClefPath {
	/** Staff line the glyph's origin sits on, counted from the top line. */
	readonly line: number;
	/** SVG path data, in Gonville font units with y already flipped. */
	readonly d: string;
}

export const CLEF_PATHS: Record<RangeClef, ClefPath> = {
	// G clef: origin on the G line, the second line up. Reaches 4.10 spaces
	// above that line and 2.39 below it.
	treble: {
		line: 3,
		d: "M488,-1499C490,-1500 492,-1500 495,-1500C507,-1500 521,-1490 541,-1465C622,-1372 679,-1210 679,-1078C679,-1068 677,-1060 677,-1050C668,-893 604,-764 477,-642L443,-609L431,-596L431,-592L438,-562L449,-508L460,-458C475,-390 481,-355 481,-355C481,-355 481,-355 481,-355C481,-355 485,-355 490,-356C495,-356 511,-358 528,-358C540,-358 552,-356 558,-356C699,-338 808,-237 839,-95C845,-72 847,-47 847,-22C847,113 766,242 631,303C623,308 620,309 620,309L620,310C620,310 626,333 631,359L646,435L660,496C668,535 672,563 672,588C672,610 669,630 664,653C630,792 509,875 383,875C321,875 257,855 201,810C151,768 129,730 129,680C129,592 200,530 274,530C300,530 326,538 351,553C393,582 412,626 412,669C412,735 366,800 287,805L279,805L285,809C318,823 351,830 383,830C464,830 540,789 586,718C612,678 626,631 626,584C626,566 623,548 619,528C619,526 616,510 612,495C590,387 577,324 577,324C577,324 577,324 577,324C575,324 571,324 568,326C558,328 537,333 528,334C506,337 485,338 465,338C269,338 87,206 24,11C8,-41 -1,-93 -1,-145C-1,-249 32,-351 96,-442C166,-541 236,-626 322,-714L352,-745L345,-782L332,-843L315,-921C310,-950 304,-978 303,-984C298,-1017 295,-1049 295,-1082C295,-1208 336,-1329 413,-1426C436,-1456 477,-1496 488,-1499M549,-1301C547,-1301 544,-1301 541,-1301C500,-1301 447,-1263 411,-1207C374,-1152 355,-1079 355,-1004C355,-984 356,-963 359,-942C362,-927 363,-917 371,-881L385,-818C389,-799 392,-784 392,-782L392,-782C393,-782 424,-816 434,-828C534,-941 594,-1060 607,-1165C608,-1175 608,-1183 608,-1193C608,-1224 604,-1254 597,-1270C589,-1286 571,-1299 549,-1301M398,-528C396,-542 393,-553 393,-555C393,-555 393,-555 392,-555C390,-555 347,-505 317,-470C266,-408 212,-334 190,-298C148,-227 127,-148 127,-70C127,-19 137,30 155,77C209,216 333,303 468,303C484,303 502,302 519,299C541,295 568,287 568,284L568,284C568,284 566,274 563,263L534,120L511,13L496,-61L480,-133C472,-176 469,-187 469,-187C469,-187 469,-188 468,-188C462,-188 430,-172 416,-162C364,-126 337,-69 337,-13C337,40 363,93 413,124C424,131 428,137 428,144C428,145 428,148 428,149C426,161 419,166 409,166C405,166 400,165 394,162C302,122 240,27 240,-77L240,-77C240,-197 315,-301 430,-342L436,-344L426,-394L398,-528M548,-194C540,-195 532,-195 526,-195C524,-195 521,-195 519,-195L514,-195L518,-177L539,-79L552,-15L566,48L594,187L605,240C609,254 611,266 612,266C612,266 612,266 612,266C613,266 630,256 641,248C692,212 730,156 744,98C749,79 751,59 751,40C751,-76 665,-181 548,-194",
	},
	// F clef: origin on the F line, the second line down, which is the line
	// the two dots straddle.
	bass: {
		line: 1,
		d: "M307,-349C315,-351 323,-351 332,-351C367,-351 408,-347 443,-340C607,-306 720,-195 741,-47C743,-31 744,-16 744,0C744,90 713,206 660,303C534,531 304,695 28,755C23,755 19,756 14,756C4,756 -1,750 -1,741C-1,731 1,728 21,720C337,601 548,344 567,56C568,41 568,24 568,11C568,-129 525,-233 442,-285C406,-308 367,-319 325,-319C232,-319 137,-266 93,-177C91,-170 84,-155 84,-154C84,-154 84,-154 84,-154C84,-154 85,-155 88,-156C110,-170 134,-177 159,-177C194,-177 231,-162 257,-134C281,-108 294,-73 294,-41C294,24 246,90 171,97C166,97 161,98 156,98C73,98 6,22 6,-74C6,-76 6,-79 6,-80C10,-223 141,-340 307,-349M839,-215C841,-216 842,-216 845,-216C852,-216 860,-215 862,-213C887,-206 899,-184 899,-163C899,-145 890,-127 872,-117C865,-112 856,-111 847,-111C833,-111 818,-117 808,-130C800,-140 796,-151 796,-162C796,-187 812,-212 839,-215M839,112C841,112 842,112 845,112C852,112 860,113 862,115C887,122 899,144 899,165C899,183 890,201 872,210C865,215 856,217 847,217C833,217 818,210 808,198C800,188 796,177 796,165C796,140 812,116 839,112",
	},
};

/**
 * The `transform` that drops a clef onto a staff.
 *
 * `topLineY` is the y of the top staff line and `lineSpacing` the distance
 * between two lines, so the caller never has to know which line the glyph
 * anchors to.
 */
export function clefTransform(
	clef: RangeClef,
	x: number,
	topLineY: number,
	lineSpacing: number,
): string {
	const anchorY = topLineY + CLEF_PATHS[clef].line * lineSpacing;
	const scale = lineSpacing / CLEF_UNITS_PER_SPACE;
	return `translate(${x} ${anchorY}) scale(${scale})`;
}

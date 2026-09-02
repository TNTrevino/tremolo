import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from "@angular/core";

/**
 * A key signature drawn as its accidental glyphs (♭♭♭ / ♯♯♯) with the
 * staggered baseline of a real staff, instead of a text label like "3♭".
 *
 * Port of
 * frontend-react/src/features/identification-game/components/KeySignatureGlyph.tsx.
 * Reusable by any game with a key-signature setting; the key signature
 * game's 15 chips are its only caller today.
 *
 * This component is why `keySignature.tsx` was a `.tsx` at all -- React
 * baked a `<KeySignatureGlyph>` element into each of the 15 `ChoiceOption`s.
 * Under D9 the option carries `{ kind: "keySignature", fifths }` instead and
 * `<app-settings-controls>` renders this, so the game definition is plain
 * data again.
 */
@Component({
	selector: "app-key-signature-glyph",
	imports: [],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: contents;
		}
	`,
	template: `
		@if (fifths() === 0) {
			<span [attr.aria-label]="label()" [class]="className()">♮</span>
		} @else {
			<span
				[attr.aria-label]="label()"
				[class]="'inline-flex items-center leading-none ' + className()"
			>
				@for (offset of offsets(); track $index) {
					<span
						aria-hidden="true"
						[class]="$index > 0 ? '-ml-0.5' : ''"
						[style.transform]="'translateY(' + offset + ')'"
						>{{ symbol() }}</span
					>
				}
			</span>
		}
	`,
})
export class KeySignatureGlyphComponent {
	/** Fifths count: negative = flats, 0 = no accidentals, positive = sharps. */
	readonly fifths = input.required<number>();

	readonly className = input("");

	protected readonly label = computed(() => keySignatureName(this.fifths()));
	protected readonly symbol = computed(() => (this.fifths() > 0 ? "♯" : "♭"));

	/**
	 * One entry per accidental, carrying its vertical nudge. React computed
	 * the same `translateY` inline from the index; a list of offsets keeps
	 * the arithmetic out of the template.
	 */
	protected readonly offsets = computed(() =>
		Array.from({ length: Math.abs(this.fifths()) }, (_, i) =>
			i % 2 === 0 ? "0.12em" : "-0.18em",
		),
	);
}

/** Human-readable name for a fifths count (used for accessible labels). */
export function keySignatureName(fifths: number): string {
	if (fifths === 0) return "no accidentals";
	const kind = fifths > 0 ? "sharp" : "flat";
	const count = Math.abs(fifths);
	return `${count} ${kind}${count > 1 ? "s" : ""}`;
}

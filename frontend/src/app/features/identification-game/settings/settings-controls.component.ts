import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
	output,
} from "@angular/core";

import { SelectComponent } from "@shared/components/ui/select.component";

import { ClefGlyphComponent } from "../components/clef-glyph/clef-glyph.component";
import { KeySignatureGlyphComponent } from "../components/key-signature-glyph/key-signature-glyph.component";
import type {
	ChoiceOption,
	OptionGlyph,
	SettingDescriptor,
} from "../models/setting-descriptor.models";
import { SettingChipComponent } from "./setting-chip.component";

/**
 * Renders a game's settings schema.
 *
 * Port of
 * frontend-react/src/features/identification-game/settings/SettingsControls.tsx.
 * Layout matches the settings bar: label above control, controls flow
 * inline.
 *
 * The one structural change is D9's. React's `ChoiceOption.render` carried
 * a React element, so a chip drew itself; here the option carries an
 * `OptionGlyph` and **this component is the only thing that knows which
 * component draws which kind**. That is what makes the four game
 * definitions plain `.ts` data.
 *
 * The schema is normalised into view rows first so the template can
 * `@switch` on a discriminant that is always present -- an optional
 * `glyph?.kind` would not narrow, and `@if (fifths; as f)` would silently
 * drop the natural key, whose `fifths` is zero.
 *
 * Also exported for the teacher's create-assignment flow, which configures
 * a game and snapshots the result as an assignment config.
 */

interface ChipView {
	value: string | number;
	label: string;
	glyph: OptionGlyph;
	selected: boolean;
}

interface SettingRow {
	key: string;
	label: string;
	kind: SettingDescriptor<never>["kind"];
	options: ChipView[];
	/** `choice` only: the current value, as the `<select>` spells it. */
	choiceValue: string;
	/** `toggle` only. */
	toggled: boolean;
}

@Component({
	selector: "app-settings-controls",
	imports: [
		ClefGlyphComponent,
		KeySignatureGlyphComponent,
		SelectComponent,
		SettingChipComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: contents;
		}
	`,
	template: `
		@for (row of rows(); track row.key) {
			<div class="space-y-1">
				<span class="block text-xs font-medium">{{ row.label }}</span>

				@switch (row.kind) {
					@case ("choice") {
						<app-select
							[ariaLabel]="row.label"
							[value]="row.choiceValue"
							(valueChange)="onChoice(row, $event)"
						>
							@for (option of row.options; track option.value) {
								<option [value]="option.value">{{ option.label }}</option>
							}
						</app-select>
					}
					@case ("multiChoice") {
						<div class="flex flex-wrap gap-1">
							@for (option of row.options; track option.value) {
								<app-setting-chip
									[selected]="option.selected"
									[ariaLabel]="option.label"
									(pressed)="onToggleOption(row, option.value)"
								>
									@switch (option.glyph.kind) {
										@case ("keySignature") {
											<app-key-signature-glyph
												[fifths]="option.glyph.fifths"
												className="px-0.5 text-lg"
											/>
										}
										@case ("clef") {
											<app-clef-glyph [clef]="option.glyph.clef" />
										}
										@default {
											{{ option.label }}
										}
									}
								</app-setting-chip>
							}
						</div>
					}
					@case ("toggle") {
						<app-setting-chip
							[selected]="row.toggled"
							[ariaPressed]="row.toggled"
							(pressed)="onToggle(row)"
						>
							{{ row.toggled ? "On" : "Off" }}
						</app-setting-chip>
					}
				}
			</div>
		}
	`,
})
export class SettingsControlsComponent {
	readonly schema = input.required<SettingDescriptor<never>[]>();

	/**
	 * The live settings, keyed by descriptor. Typed as `object` rather than
	 * `Record<string, unknown>` so a game's own settings *interface* is
	 * assignable -- an interface has no index signature, and the alternative
	 * is a cast at all four call sites instead of one here.
	 */
	readonly settings = input.required<object>();

	/** A partial patch to merge over the current settings. */
	readonly changed = output<Record<string, unknown>>();

	protected readonly rows = computed<SettingRow[]>(() => {
		const settings = this.settings() as Record<string, unknown>;

		return this.schema().map((descriptor) => {
			const raw = settings[descriptor.key];
			const options: ChoiceOption[] =
				descriptor.kind === "toggle" ? [] : descriptor.options;
			const selectedValues = Array.isArray(raw)
				? (raw as (string | number)[])
				: [];

			return {
				key: descriptor.key,
				label: descriptor.label,
				kind: descriptor.kind,
				options: options.map((option) => ({
					value: option.value,
					label: option.label,
					glyph: option.glyph ?? { kind: "text" },
					selected: selectedValues.includes(option.value),
				})),
				choiceValue: String(raw),
				toggled: Boolean(raw),
			};
		});
	});

	protected onChoice(row: SettingRow, value: string): void {
		// The `<select>` deals in strings; the schema knows the real type, so
		// the match is what carries a numeric option back as a number.
		const match = row.options.find((o) => String(o.value) === value);
		if (!match) return;
		this.changed.emit({ [row.key]: match.value });
	}

	/**
	 * Toggles one option of a multi-select.
	 *
	 * Two rules, both React's and both load-bearing: deselecting the last
	 * selected option is ignored, so a game can never be left with an empty
	 * question pool; and the result is rebuilt in *schema* order, so the
	 * pool -- and therefore the queue's serialized key -- does not depend on
	 * the order the player clicked.
	 */
	protected onToggleOption(row: SettingRow, value: string | number): void {
		const values = row.options.filter((o) => o.selected).map((o) => o.value);
		const isSelected = values.includes(value);
		if (isSelected && values.length === 1) return;

		const next = isSelected
			? values.filter((v) => v !== value)
			: row.options
					.map((o) => o.value)
					.filter((v) => values.includes(v) || v === value);

		this.changed.emit({ [row.key]: next });
	}

	protected onToggle(row: SettingRow): void {
		this.changed.emit({ [row.key]: !row.toggled });
	}
}

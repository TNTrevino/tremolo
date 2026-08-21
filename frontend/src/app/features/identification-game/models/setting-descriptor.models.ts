/**
 * The declarative settings schema.
 *
 * Port of frontend-react/src/features/identification-game/settings/types.ts
 * with **one change, mandated by D9 / PLAN.md §5.7**: `ChoiceOption.render`
 * was `React.ReactNode`, which is what forced `keySignature` to be a `.tsx`.
 * It becomes `glyph?: OptionGlyph`, a discriminated union of plain data
 * that `<app-settings-controls>` `@switch`es on.
 *
 * A game describes its settings as a list of descriptors. `SettingsControls`
 * renders them and `sanitizeConfig` validates persisted JSON against them,
 * so adding a setting to a game is one descriptor plus one field in its
 * defaults -- no shared UI change, ever.
 */

import type { StaffClef } from "@shared/models/music.models";

/**
 * How a chip draws its option.
 *
 * `text` is the default and needs no entry: an option without a `glyph`
 * renders its `label`. The other two name a component the settings control
 * knows how to render, and carry the data that component needs. Dropdowns
 * ignore this entirely and always show the text label, exactly as React's
 * `render` was chip-only.
 */
export type OptionGlyph =
	| { kind: "text" }
	| { kind: "keySignature"; fifths: number }
	| { kind: "clef"; clef: StaffClef };

export interface ChoiceOption {
	value: string | number;
	/** Accessible text label; also what a dropdown option shows. */
	label: string;
	/** Rich chip rendering. Omitted means the plain text label. */
	glyph?: OptionGlyph;
}

interface BaseDescriptor<S> {
	key: keyof S & string;
	label: string;
}

/** Single-select, rendered as a dropdown. */
export interface ChoiceSetting<S> extends BaseDescriptor<S> {
	kind: "choice";
	options: ChoiceOption[];
}

/**
 * Multi-select, rendered as toggle chips. At least one option always stays
 * selected -- deselecting the last one is ignored.
 */
export interface MultiChoiceSetting<S> extends BaseDescriptor<S> {
	kind: "multiChoice";
	options: ChoiceOption[];
}

/** Boolean, rendered as an On/Off chip. */
export interface ToggleSetting<S> extends BaseDescriptor<S> {
	kind: "toggle";
}

export type SettingDescriptor<S> =
	ChoiceSetting<S> | MultiChoiceSetting<S> | ToggleSetting<S>;

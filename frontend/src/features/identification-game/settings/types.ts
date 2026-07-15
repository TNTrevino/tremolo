/**
 * Declarative settings schema for identification games.
 *
 * Each game describes its settings as a list of descriptors; the
 * generic SettingsControls component renders them and sanitizeConfig
 * validates persisted JSON against them. Adding a setting to a game =
 * one descriptor + one field in its defaults. No shared UI changes.
 */

export interface ChoiceOption {
	value: string | number;
	/** Accessible text label (also used by dropdown options) */
	label: string;
	/**
	 * Optional rich rendering for chip controls (e.g. key signature
	 * glyphs). Dropdowns always fall back to the text label.
	 */
	render?: React.ReactNode;
}

interface BaseDescriptor<S> {
	key: keyof S & string;
	label: string;
}

/** Single-select rendered as a dropdown. */
export interface ChoiceSetting<S> extends BaseDescriptor<S> {
	kind: "choice";
	options: ChoiceOption[];
}

/**
 * Multi-select rendered as toggle chips. At least one option always
 * stays selected (deselecting the last one is ignored).
 */
export interface MultiChoiceSetting<S> extends BaseDescriptor<S> {
	kind: "multiChoice";
	options: ChoiceOption[];
}

/** Boolean rendered as an on/off chip. */
export interface ToggleSetting<S> extends BaseDescriptor<S> {
	kind: "toggle";
}

export type SettingDescriptor<S> =
	| ChoiceSetting<S>
	| MultiChoiceSetting<S>
	| ToggleSetting<S>;

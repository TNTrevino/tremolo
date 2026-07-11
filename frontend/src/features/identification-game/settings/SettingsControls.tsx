import { Button } from "@/shared/components/ui/button";
import { Select } from "@/shared/components/ui/select";
import type { SettingDescriptor, MultiChoiceSetting } from "./types";

export interface SettingsControlsProps<S> {
	schema: SettingDescriptor<S>[];
	settings: S;
	onChange: (patch: Partial<S>) => void;
}

function MultiChoiceChips<S>({
	descriptor,
	values,
	onChange,
}: {
	descriptor: MultiChoiceSetting<S>;
	values: Array<string | number>;
	onChange: (next: Array<string | number>) => void;
}) {
	const toggle = (value: string | number) => {
		const selected = values.includes(value);
		if (selected && values.length === 1) return; // keep at least one
		onChange(
			selected
				? values.filter((v) => v !== value)
				: [
						// preserve schema order so pools stay stable
						...descriptor.options
							.map((o) => o.value)
							.filter((v) => values.includes(v) || v === value),
					],
		);
	};

	return (
		<div className="flex flex-wrap gap-1">
			{descriptor.options.map((option) => (
				<Button
					key={String(option.value)}
					type="button"
					size="sm"
					className="h-7 px-2 text-xs"
					variant={values.includes(option.value) ? "default" : "outline"}
					onClick={() => toggle(option.value)}
					aria-label={option.label}
				>
					{option.render ?? option.label}
				</Button>
			))}
		</div>
	);
}

/**
 * Renders a game's settings schema. Layout matches the settings bar:
 * label above control, controls flow inline.
 */
export function SettingsControls<S>({
	schema,
	settings,
	onChange,
}: SettingsControlsProps<S>) {
	return (
		<>
			{schema.map((descriptor) => {
				const raw = settings[descriptor.key] as unknown;
				return (
					<div key={descriptor.key} className="space-y-1">
						<span className="block text-xs font-medium">
							{descriptor.label}
						</span>
						{descriptor.kind === "choice" && (
							<Select
								aria-label={descriptor.label}
								value={String(raw)}
								onChange={(e) => {
									const match = descriptor.options.find(
										(o) => String(o.value) === e.target.value,
									);
									onChange({
										[descriptor.key]: match?.value,
									} as Partial<S>);
								}}
							>
								{descriptor.options.map((option) => (
									<option
										key={String(option.value)}
										value={String(option.value)}
									>
										{option.label}
									</option>
								))}
							</Select>
						)}
						{descriptor.kind === "multiChoice" && (
							<MultiChoiceChips
								descriptor={descriptor}
								values={raw as Array<string | number>}
								onChange={(next) =>
									onChange({ [descriptor.key]: next } as Partial<S>)
								}
							/>
						)}
						{descriptor.kind === "toggle" && (
							<Button
								type="button"
								size="sm"
								className="h-7 px-2 text-xs"
								variant={raw ? "default" : "outline"}
								aria-pressed={Boolean(raw)}
								onClick={() =>
									onChange({ [descriptor.key]: !raw } as Partial<S>)
								}
							>
								{raw ? "On" : "Off"}
							</Button>
						)}
					</div>
				);
			})}
		</>
	);
}

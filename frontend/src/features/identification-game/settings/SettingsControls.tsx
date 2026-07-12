import { Select } from "@/shared/components/ui/select";
import { cn } from "@/lib/utils";
import type { SettingDescriptor, MultiChoiceSetting } from "./types";

export interface SettingsControlsProps<S> {
	schema: SettingDescriptor<S>[];
	settings: S;
	onChange: (patch: Partial<S>) => void;
}

/**
 * Toggle chip with a constant box: the border is present in both
 * states (only its color changes), so selecting a chip never resizes
 * it and reflows the row. Height grows with content — glyph chips
 * (clefs, key signatures) are taller than text chips.
 */
function Chip({
	selected,
	onClick,
	ariaLabel,
	ariaPressed,
	children,
}: {
	selected: boolean;
	onClick: () => void;
	ariaLabel?: string;
	ariaPressed?: boolean;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={ariaLabel}
			aria-pressed={ariaPressed}
			className={cn(
				"inline-flex min-h-7 items-center justify-center rounded-md border-2 px-2 py-0.5 text-xs font-medium transition-colors",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
				selected
					? "border-primary bg-primary text-primary-foreground"
					: "border-input bg-background hover:bg-accent hover:text-accent-foreground",
			)}
		>
			{children}
		</button>
	);
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
				<Chip
					key={String(option.value)}
					selected={values.includes(option.value)}
					onClick={() => toggle(option.value)}
					ariaLabel={option.label}
				>
					{option.render ?? option.label}
				</Chip>
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
							<Chip
								selected={Boolean(raw)}
								ariaPressed={Boolean(raw)}
								onClick={() =>
									onChange({ [descriptor.key]: !raw } as Partial<S>)
								}
							>
								{raw ? "On" : "Off"}
							</Chip>
						)}
					</div>
				);
			})}
		</>
	);
}

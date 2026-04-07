import { useCallback, useState } from "react";
import { hslStringToHex, hexToHslString } from "../utils/color-utils";

interface ColorPickerFieldProps {
	label: string;
	value: string; // HSL string like "262 83% 58%"
	onChange: (hslValue: string) => void;
}

export function ColorPickerField({
	label,
	value,
	onChange,
}: ColorPickerFieldProps) {
	let hexValue: string;
	try {
		hexValue = hslStringToHex(value);
	} catch {
		console.warn(
			"ColorPickerField: invalid HSL value, falling back to #000000",
			value,
		);
		hexValue = "#000000";
	}

	const [textValue, setTextValue] = useState(hexValue);
	const [isFocused, setIsFocused] = useState(false);

	const displayValue = isFocused ? textValue : hexValue;

	const handlePickerChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			let hsl: string;
			try {
				hsl = hexToHslString(e.target.value);
			} catch {
				console.warn(
					"ColorPickerField: failed to convert hex to HSL",
					e.target.value,
				);
				return;
			}
			setTextValue(e.target.value);
			onChange(hsl);
		},
		[onChange],
	);

	const handleTextChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const raw = e.target.value;
			setTextValue(raw);

			const normalized = raw.startsWith("#") ? raw : `#${raw}`;
			if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
				let hsl: string;
				try {
					hsl = hexToHslString(normalized);
				} catch {
					console.warn(
						"ColorPickerField: failed to convert hex to HSL",
						normalized,
					);
					return;
				}
				onChange(hsl);
			}
		},
		[onChange],
	);

	const handleFocus = useCallback(() => {
		setTextValue(hexValue);
		setIsFocused(true);
	}, [hexValue]);

	const handleBlur = useCallback(() => {
		setIsFocused(false);
	}, []);

	return (
		<div className="flex items-center justify-between gap-4">
			<label className="text-sm font-medium text-foreground whitespace-nowrap">
				{label}
			</label>
			<div className="flex items-center gap-2">
				<input
					type="color"
					value={hexValue}
					onChange={handlePickerChange}
					className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent p-0.5"
				/>
				<input
					type="text"
					value={displayValue}
					onChange={handleTextChange}
					onFocus={handleFocus}
					onBlur={handleBlur}
					className="w-20 text-xs font-mono bg-transparent border border-border rounded px-1.5 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
					spellCheck={false}
				/>
			</div>
		</div>
	);
}

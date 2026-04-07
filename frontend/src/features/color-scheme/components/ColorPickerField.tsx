import { useCallback } from "react";
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
		hexValue = "#000000";
	}

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			try {
				const hsl = hexToHslString(e.target.value);
				onChange(hsl);
			} catch {
				// ignore invalid hex values from the picker
			}
		},
		[onChange],
	);

	return (
		<div className="flex items-center justify-between gap-4">
			<label className="text-sm font-medium text-foreground whitespace-nowrap">
				{label}
			</label>
			<div className="flex items-center gap-2">
				<input
					type="color"
					value={hexValue}
					onChange={handleChange}
					className="h-8 w-8 cursor-pointer rounded border border-border bg-transparent p-0.5"
				/>
				<span className="text-xs text-muted-foreground font-mono w-16">
					{hexValue}
				</span>
			</div>
		</div>
	);
}

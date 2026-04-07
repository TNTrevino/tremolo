import { useState } from "react";
import type { ColorSchemeColors } from "@/services/api/types";
import { ColorPickerField } from "./ColorPickerField";
import { ThemePreview } from "./ThemePreview";
import { Button } from "@/shared/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/shared/components/ui/card";

interface ThemeEditorProps {
	initialName?: string;
	initialIsDark?: boolean;
	initialColors?: ColorSchemeColors;
	onSave: (name: string, isDark: boolean, colors: ColorSchemeColors) => void;
	onCancel: () => void;
	isLoading?: boolean;
}

const DEFAULT_LIGHT_COLORS: ColorSchemeColors = {
	background: "0 0% 100%",
	foreground: "240 10% 3.9%",
	card: "0 0% 100%",
	card_foreground: "240 10% 3.9%",
	popover: "0 0% 100%",
	popover_foreground: "240 10% 3.9%",
	primary: "262 83% 58%",
	primary_foreground: "0 0% 98%",
	secondary: "240 4.8% 95.9%",
	secondary_foreground: "240 5.9% 10%",
	muted: "240 4.8% 95.9%",
	muted_foreground: "240 3.8% 46.1%",
	accent: "45 93% 47%",
	accent_foreground: "240 5.9% 10%",
	destructive: "0 84.2% 60.2%",
	destructive_foreground: "0 0% 98%",
	border: "240 5.9% 90%",
	input: "240 5.9% 90%",
	ring: "262 83% 58%",
};

const COLOR_CATEGORIES: {
	title: string;
	fields: { key: keyof ColorSchemeColors; label: string }[];
}[] = [
	{
		title: "Base",
		fields: [
			{ key: "background", label: "Background" },
			{ key: "foreground", label: "Foreground" },
		],
	},
	{
		title: "Cards & Popovers",
		fields: [
			{ key: "card", label: "Card" },
			{ key: "card_foreground", label: "Card Foreground" },
			{ key: "popover", label: "Popover" },
			{ key: "popover_foreground", label: "Popover Foreground" },
		],
	},
	{
		title: "Primary",
		fields: [
			{ key: "primary", label: "Primary" },
			{ key: "primary_foreground", label: "Primary Foreground" },
		],
	},
	{
		title: "Secondary",
		fields: [
			{ key: "secondary", label: "Secondary" },
			{ key: "secondary_foreground", label: "Secondary Foreground" },
		],
	},
	{
		title: "Muted",
		fields: [
			{ key: "muted", label: "Muted" },
			{ key: "muted_foreground", label: "Muted Foreground" },
		],
	},
	{
		title: "Accent",
		fields: [
			{ key: "accent", label: "Accent" },
			{ key: "accent_foreground", label: "Accent Foreground" },
		],
	},
	{
		title: "Destructive",
		fields: [
			{ key: "destructive", label: "Destructive" },
			{ key: "destructive_foreground", label: "Destructive Foreground" },
		],
	},
	{
		title: "Borders & Input",
		fields: [
			{ key: "border", label: "Border" },
			{ key: "input", label: "Input" },
			{ key: "ring", label: "Ring" },
		],
	},
];

export function ThemeEditor({
	initialName = "",
	initialIsDark = false,
	initialColors,
	onSave,
	onCancel,
	isLoading = false,
}: ThemeEditorProps) {
	const [name, setName] = useState(initialName);
	const [isDark, setIsDark] = useState(initialIsDark);
	const [colors, setColors] = useState<ColorSchemeColors>(
		initialColors ?? { ...DEFAULT_LIGHT_COLORS },
	);

	const updateColor = (key: keyof ColorSchemeColors, value: string) => {
		setColors((prev) => ({ ...prev, [key]: value }));
	};

	const handleSave = () => {
		if (!name.trim()) return;
		onSave(name.trim(), isDark, colors);
	};

	return (
		<Card className="shadow-lg">
			<CardHeader>
				<CardTitle>{initialName ? "Edit Theme" : "Create New Theme"}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Name and dark mode toggle */}
				<div className="flex flex-col gap-4 sm:flex-row sm:items-end">
					<div className="flex-1 space-y-1">
						<label
							htmlFor="theme-name"
							className="text-sm font-medium text-foreground"
						>
							Theme Name
						</label>
						<input
							id="theme-name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="My Custom Theme"
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						/>
					</div>
					<label className="flex items-center gap-2 cursor-pointer">
						<input
							type="checkbox"
							checked={isDark}
							onChange={(e) => setIsDark(e.target.checked)}
							className="h-4 w-4 rounded border-border"
						/>
						<span className="text-sm font-medium text-foreground">
							Dark Theme
						</span>
					</label>
				</div>

				{/* Live preview */}
				<div className="space-y-2">
					<h3 className="text-sm font-medium text-foreground">Live Preview</h3>
					<ThemePreview colors={colors} />
				</div>

				{/* Color categories */}
				<div className="grid gap-6 md:grid-cols-2">
					{COLOR_CATEGORIES.map((category) => (
						<div key={category.title} className="space-y-3">
							<h3 className="text-sm font-semibold text-foreground border-b border-border pb-1">
								{category.title}
							</h3>
							<div className="space-y-2">
								{category.fields.map((field) => (
									<ColorPickerField
										key={field.key}
										label={field.label}
										value={colors[field.key]}
										onChange={(val) => updateColor(field.key, val)}
									/>
								))}
							</div>
						</div>
					))}
				</div>

				{/* Actions */}
				<div className="flex gap-3 pt-2">
					<Button onClick={handleSave} disabled={isLoading || !name.trim()}>
						{isLoading ? "Saving..." : "Save Theme"}
					</Button>
					<Button variant="outline" onClick={onCancel} disabled={isLoading}>
						Cancel
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

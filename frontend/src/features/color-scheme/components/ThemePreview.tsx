import type { ColorSchemeColors } from "@/services/api/types";

interface ThemePreviewProps {
	colors: ColorSchemeColors;
	className?: string;
}

export function ThemePreview({ colors, className = "" }: ThemePreviewProps) {
	return (
		<div
			className={`rounded-lg border overflow-hidden ${className}`}
			style={{
				backgroundColor: `hsl(${colors.background})`,
				color: `hsl(${colors.foreground})`,
				borderColor: `hsl(${colors.border})`,
				width: 200,
				height: 120,
				padding: 10,
			}}
		>
			{/* Mini card */}
			<div
				style={{
					backgroundColor: `hsl(${colors.card})`,
					color: `hsl(${colors.card_foreground})`,
					borderColor: `hsl(${colors.border})`,
					borderWidth: 1,
					borderStyle: "solid",
					borderRadius: 6,
					padding: 8,
					marginBottom: 8,
				}}
			>
				<div
					style={{
						fontSize: 9,
						fontWeight: 600,
						marginBottom: 4,
					}}
				>
					Card Title
				</div>
				<div
					style={{
						fontSize: 7,
						color: `hsl(${colors.muted_foreground})`,
					}}
				>
					Muted description text
				</div>
			</div>

			{/* Bottom row: primary button + accent indicator */}
			<div style={{ display: "flex", gap: 6, alignItems: "center" }}>
				<div
					style={{
						backgroundColor: `hsl(${colors.primary})`,
						color: `hsl(${colors.primary_foreground})`,
						borderRadius: 4,
						padding: "3px 10px",
						fontSize: 7,
						fontWeight: 600,
					}}
				>
					Button
				</div>
				<div
					style={{
						backgroundColor: `hsl(${colors.secondary})`,
						color: `hsl(${colors.secondary_foreground})`,
						borderRadius: 4,
						padding: "3px 8px",
						fontSize: 7,
					}}
				>
					Secondary
				</div>
				<div
					style={{
						width: 10,
						height: 10,
						borderRadius: "50%",
						backgroundColor: `hsl(${colors.accent})`,
						flexShrink: 0,
					}}
				/>
			</div>
		</div>
	);
}

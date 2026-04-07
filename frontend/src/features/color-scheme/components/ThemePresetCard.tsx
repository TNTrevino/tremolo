import type { ColorSchemeResponse } from "@/services/api/types";
import { ThemePreview } from "./ThemePreview";
import { Button } from "@/shared/components/ui/button";
import { Check } from "lucide-react";

interface ThemePresetCardProps {
	scheme: ColorSchemeResponse;
	isActive: boolean;
	onActivate: () => void;
}

export function ThemePresetCard({
	scheme,
	isActive,
	onActivate,
}: ThemePresetCardProps) {
	return (
		<div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-4">
			<ThemePreview colors={scheme.colors} />
			<div className="text-sm font-medium text-card-foreground">
				{scheme.name}
			</div>
			{isActive ? (
				<span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
					<Check className="h-3 w-3" />
					Active
				</span>
			) : (
				<Button variant="outline" size="sm" onClick={onActivate}>
					Activate
				</Button>
			)}
		</div>
	);
}

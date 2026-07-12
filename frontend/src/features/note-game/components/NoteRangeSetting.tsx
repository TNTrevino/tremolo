import { Button } from "@/shared/components/ui/button";
import type { RangeClef } from "@/services/api/types";
import type { GameSettings as GameSettingsType } from "../types";
import { DEFAULT_RANGE } from "../rangeUtils";
import { StaffRangePicker } from "./StaffRangePicker";

export interface NoteRangeSettingProps {
	settings: Pick<GameSettingsType, "clef" | "lowNote" | "highNote">;
	onSettingsChange: (settings: Partial<GameSettingsType>) => void;
}

/**
 * Clef toggle + staff range picker, shared by every note game settings
 * surface (start screen, desktop bar dialog, mobile drawer).
 * Switching clef resets the range to that clef's default so the
 * endpoints always sit near the staff.
 */
export function NoteRangeSetting({
	settings,
	onSettingsChange,
}: NoteRangeSettingProps) {
	const selectClef = (clef: RangeClef) => {
		if (clef === settings.clef) return;
		onSettingsChange({
			clef,
			lowNote: DEFAULT_RANGE[clef].low,
			highNote: DEFAULT_RANGE[clef].high,
		});
	};

	return (
		<div className="space-y-2">
			<div className="flex gap-2 justify-center">
				<Button
					type="button"
					size="sm"
					variant={settings.clef === "treble" ? "default" : "outline"}
					onClick={() => selectClef("treble")}
				>
					Treble
				</Button>
				<Button
					type="button"
					size="sm"
					variant={settings.clef === "bass" ? "default" : "outline"}
					onClick={() => selectClef("bass")}
				>
					Bass
				</Button>
			</div>
			<div className="flex justify-center">
				<StaffRangePicker
					clef={settings.clef}
					low={settings.lowNote}
					high={settings.highNote}
					onChange={(lowNote, highNote) =>
						onSettingsChange({ lowNote, highNote })
					}
				/>
			</div>
			<div className="text-xs text-muted-foreground text-center">
				{settings.lowNote} – {settings.highNote}
			</div>
		</div>
	);
}

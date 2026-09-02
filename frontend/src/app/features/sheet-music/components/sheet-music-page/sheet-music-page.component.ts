import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	signal,
} from "@angular/core";
import { NgIcon } from "@ng-icons/core";

import { LoggerService } from "../../../../core/services/logger.service";
import { ButtonComponent } from "../../../../shared/components/ui/button.component";
import { CardDirective } from "../../../../shared/components/ui/card.directive";
import { SelectComponent } from "../../../../shared/components/ui/select.component";
import {
	describeRhythm,
	RhythmGlyphComponent,
	type RhythmType,
} from "../../../../shared/components/music/rhythm-glyph.component";
import { MusicService } from "../../../../shared/services/music.service";
import { getErrorMessage } from "../../../../shared/utils/error.utils";
import { SheetMusicDisplayComponent } from "../sheet-music-display/sheet-music-display.component";

/**
 * The twelve major keys the generator offers.
 *
 * React held music21 spellings here (`tonic: "B-"`) and posted them
 * straight through, which quietly put wire notation in page code. These are
 * UI spellings; `MusicService` converts them at the boundary, so the request
 * body is byte-identical and `frontend/CLAUDE.md`'s "feature code never sees
 * music21 `-` flats" holds literally.
 */
const SCALES = [
	{ label: "C Major", tonic: "C" },
	{ label: "F Major", tonic: "F" },
	{ label: "Bb Major", tonic: "Bb" },
	{ label: "Eb Major", tonic: "Eb" },
	{ label: "Ab Major", tonic: "Ab" },
	{ label: "Db Major", tonic: "Db" },
	{ label: "Gb Major", tonic: "Gb" },
	{ label: "G Major", tonic: "G" },
	{ label: "D Major", tonic: "D" },
	{ label: "A Major", tonic: "A" },
	{ label: "E Major", tonic: "E" },
	{ label: "B Major", tonic: "B" },
];

const OCTAVES = [3, 4, 5];
const SIXTEENTH_RHYTHMS = ["1111", "112", "121", "211", "0111"];
const EIGHTH_RHYTHMS = ["11", "01", "10"];

/**
 * Port of frontend-react/src/pages/SheetMusicPage.tsx.
 *
 * Generation is a user action, not a page load, so there is no
 * `rxResource` here (PLAN.md 5.2 covers fetch-on-load; this is React's
 * `useMutation`). A button press subscribes once, and `HttpClient`
 * completes after one emission -- the one-shot case PLAN.md 5.6 allows a
 * plain `.subscribe()` for.
 */
@Component({
	selector: "app-sheet-music-page",
	imports: [
		ButtonComponent,
		CardDirective,
		NgIcon,
		RhythmGlyphComponent,
		SelectComponent,
		SheetMusicDisplayComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./sheet-music-page.component.html",
})
export class SheetMusicPageComponent {
	private readonly music = inject(MusicService);
	private readonly logger = inject(LoggerService);

	protected readonly scales = SCALES;
	protected readonly octaves = OCTAVES;
	protected readonly sixteenthRhythms = SIXTEENTH_RHYTHMS;
	protected readonly eighthRhythms = EIGHTH_RHYTHMS;

	protected readonly scaleIndex = signal("0");
	protected readonly octave = signal("4");
	protected readonly selectedRhythm = signal<string | null>(null);
	protected readonly rhythmType = signal<RhythmType | null>(null);
	protected readonly musicXml = signal("");
	protected readonly isGenerating = signal(false);
	protected readonly error = signal<unknown>(null);

	protected readonly errorMessage = computed(() => {
		const error = this.error();
		return error === null ? "" : getErrorMessage(error);
	});

	private get currentScale() {
		return this.scales[Number(this.scaleIndex())];
	}

	protected describe(rhythm: string, rhythmType: RhythmType): string {
		return describeRhythm(rhythm, rhythmType);
	}

	protected isSelected(rhythm: string, rhythmType: RhythmType): boolean {
		return this.selectedRhythm() === rhythm && this.rhythmType() === rhythmType;
	}

	protected generateMary(): void {
		const scale = this.currentScale;
		if (!scale) return;

		this.start();
		this.music
			.generateMary({ tonic: scale.tonic, octave: Number(this.octave()) })
			.subscribe({
				next: (xml) => {
					this.musicXml.set(xml);
					this.selectedRhythm.set(null);
					this.rhythmType.set(null);
					this.isGenerating.set(false);
				},
				error: (err: unknown) => this.finishWithError(err),
			});
	}

	protected generateRhythm(rhythm: string, rhythmType: RhythmType): void {
		const scale = this.currentScale;
		if (!scale) return;

		this.selectedRhythm.set(rhythm);
		this.rhythmType.set(rhythmType);

		this.start();
		this.music
			.generateRandom({ rhythm, rhythmType, tonic: scale.tonic })
			.subscribe({
				next: (xml) => {
					this.musicXml.set(xml);
					this.isGenerating.set(false);
				},
				error: (err: unknown) => this.finishWithError(err),
			});
	}

	protected onRenderError(error: Error): void {
		this.logger.error(error.message);
	}

	private start(): void {
		this.isGenerating.set(true);
		this.error.set(null);
	}

	private finishWithError(err: unknown): void {
		this.logger.error("Failed to generate sheet music", err);
		this.error.set(err);
		this.isGenerating.set(false);
	}
}

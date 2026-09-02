import {
	ChangeDetectionStrategy,
	Component,
	ElementRef,
	inject,
	signal,
	viewChild,
} from "@angular/core";
import { NgIcon } from "@ng-icons/core";

import { LoggerService } from "../../../../core/services/logger.service";
import { ButtonComponent } from "../../../../shared/components/ui/button.component";
import { CardDirective } from "../../../../shared/components/ui/card.directive";
import { InputDirective } from "../../../../shared/components/ui/input.directive";
import { getErrorMessage } from "../../../../shared/utils/error.utils";
import { SheetMusicDisplayComponent } from "../sheet-music-display/sheet-music-display.component";

/** Extensions the picker accepts, as in React. */
const VALID_EXTENSIONS = [".xml", ".musicxml", ".mxl"];

/**
 * Port of frontend-react/src/pages/ConverterPage.tsx.
 *
 * Nothing here talks to a backend: the file is read in the browser with
 * `FileReader` and handed straight to OSMD. The three validation messages
 * are user-visible copy and are carried over verbatim.
 */
@Component({
	selector: "app-converter-page",
	imports: [
		ButtonComponent,
		CardDirective,
		InputDirective,
		NgIcon,
		SheetMusicDisplayComponent,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./converter-page.component.html",
})
export class ConverterPageComponent {
	private readonly logger = inject(LoggerService);

	private readonly fileInput =
		viewChild.required<ElementRef<HTMLInputElement>>("fileInput");

	protected readonly musicXml = signal("");
	protected readonly uploadedFileName = signal("");
	protected readonly isProcessing = signal(false);
	protected readonly error = signal("");

	protected onFileUpload(event: Event): void {
		const file = (event.target as HTMLInputElement).files?.[0];

		this.error.set("");

		if (!file) return;

		const fileName = file.name.toLowerCase();
		const isValidExtension = VALID_EXTENSIONS.some((ext) =>
			fileName.endsWith(ext),
		);

		if (!isValidExtension) {
			this.error.set(
				"Invalid file type. Please upload a MusicXML file (.xml, .musicxml, or .mxl)",
			);
			return;
		}

		this.isProcessing.set(true);
		const reader = new FileReader();

		reader.onload = (e) => {
			try {
				const xmlContent = e.target?.result as string;

				// Basic validation - check if content looks like XML
				if (!xmlContent || !xmlContent.trim().startsWith("<?xml")) {
					this.error.set(
						"Invalid file format. The file does not appear to be a valid XML file.",
					);
					this.isProcessing.set(false);
					return;
				}

				// Check if it contains MusicXML elements
				if (
					!xmlContent.includes("score-partwise") &&
					!xmlContent.includes("score-timewise")
				) {
					this.error.set(
						"Invalid MusicXML file. The file does not contain required MusicXML elements.",
					);
					this.isProcessing.set(false);
					return;
				}

				this.musicXml.set(xmlContent);
				this.uploadedFileName.set(file.name);
				this.isProcessing.set(false);
			} catch (err) {
				this.logger.error("Failed to read uploaded file", err);
				this.error.set(`Error reading file: ${getErrorMessage(err)}`);
				this.isProcessing.set(false);
			}
		};

		reader.onerror = (readerEvent) => {
			this.logger.error("FileReader error", readerEvent);
			this.error.set("Failed to read the file. Please try again.");
			this.isProcessing.set(false);
		};

		reader.readAsText(file);
	}

	protected browse(): void {
		this.fileInput().nativeElement.click();
	}

	protected onRenderError(renderError: Error): void {
		this.logger.error("Failed to render sheet music", renderError);
		this.error.set(
			`Failed to render sheet music: ${getErrorMessage(renderError)}`,
		);
	}
}

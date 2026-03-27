import { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import type { NoteGameDisplayOptions } from "./types";

export class NoteGameDisplay {
	private osmd: OpenSheetMusicDisplay;
	private container: HTMLElement;
	private zoom: number;
	private darkMode: boolean;
	private padding: number;

	constructor(options: NoteGameDisplayOptions) {
		this.container = options.container;
		this.zoom = options.zoom ?? 2.0;
		this.darkMode = options.darkMode ?? false;
		this.padding = options.padding ?? 10;

		this.osmd = new OpenSheetMusicDisplay(this.container, {
			drawingParameters: "compacttight",
			drawCredits: false,
			drawTitle: false,
			drawComposer: false,
			drawPartNames: false,
			drawMeasureNumbers: false,
			drawTimeSignatures: false,
			autoResize: false,
		});

		this.osmd.zoom = this.zoom;

		this.osmd.setOptions({
			defaultColorMusic: this.darkMode ? "#FFFFFF" : "#000000",
		});

		const rules = this.osmd.EngravingRules;
		rules.PageLeftMargin = 0;
		rules.PageRightMargin = 0;
		rules.PageTopMargin = 0;
		rules.PageBottomMargin = 0;
		rules.SystemLeftMargin = 0;
		rules.SystemRightMargin = 0;
	}

	async loadNote(musicXml: string): Promise<void> {
		await this.osmd.load(musicXml);
		this.osmd.render();
		await this.centerContent();
	}

	private centerContent(): Promise<void> {
		return new Promise((resolve) => {
			requestAnimationFrame(() => {
				const svg = this.container.querySelector("svg");
				if (!svg) {
					resolve();
					return;
				}

				const bbox = (svg as SVGSVGElement).getBBox();
				const pad = this.padding;
				const width = this.container.clientWidth;
				const height = this.container.clientHeight;

				svg.setAttribute(
					"viewBox",
					`${bbox.x - pad} ${bbox.y - pad} ${bbox.width + pad * 2} ${bbox.height + pad * 2}`,
				);
				svg.setAttribute("width", `${width}`);
				svg.setAttribute("height", `${height}`);
				svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
				resolve();
			});
		});
	}

	setDarkMode(dark: boolean): void {
		if (dark === this.darkMode) return;
		this.darkMode = dark;
		this.osmd.setOptions({
			defaultColorMusic: dark ? "#FFFFFF" : "#000000",
		});
		this.refresh();
	}

	refresh(): void {
		this.osmd.render();
		requestAnimationFrame(() => this.centerContent());
	}

	clear(): void {
		this.osmd.clear();
	}

	destroy(): void {
		this.osmd.clear();
		this.container.innerHTML = "";
	}

	get isInitialized(): boolean {
		return !!this.osmd;
	}
}

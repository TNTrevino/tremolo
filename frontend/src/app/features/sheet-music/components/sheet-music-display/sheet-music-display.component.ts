import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	input,
	output,
	viewChild,
} from "@angular/core";

import { CardDirective } from "../../../../shared/components/ui/card.directive";
import { SkeletonDirective } from "../../../../shared/components/ui/skeleton.directive";
import { SheetMusicComponent } from "../sheet-music/sheet-music.component";

/**
 * Port of frontend-react/src/features/sheet-music/components/SheetMusicDisplay.tsx.
 *
 * The card React drew around `useOSMD`: an error panel, a spinner over a
 * 400px skeleton while OSMD works, and the staff container itself, hidden
 * while either of those is showing. `<app-sheet-music>` is the hook half;
 * this is the chrome half, and the split is the same one React made.
 *
 * `musicXml` is declarative here, as it was in React -- the component loads
 * whenever the input changes, so pages just set a string. Callers that need
 * to drive OSMD imperatively (the game boards, which pop from a prefetch
 * queue) use `<app-sheet-music>` directly instead.
 *
 * The error boundary React wrapped this in is **not** ported: Angular has
 * no per-component boundary, and Phase 2's handoff (section 5) settled that
 * a feature owning a contained failure state renders it from an explicit
 * error signal. That is exactly what the error panel below is driven by.
 */
@Component({
	selector: "app-sheet-music-display",
	imports: [CardDirective, SkeletonDirective, SheetMusicComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: contents;
		}
	`,
	template: `
		<div appCard [class]="className()">
			<!-- React's <CardContent className="p-6">: tailwind-merge
			     collapsed the part's own "p-6 pt-0" to a plain "p-6", so the
			     rendered element is a div with one padding class. -->
			<div class="p-6">
				@if (error(); as failure) {
					<div
						class="bg-destructive/10 border-2 border-destructive/50 rounded-lg p-4"
					>
						<div class="flex items-start gap-3">
							<div class="flex-shrink-0 mt-0.5">
								<svg
									class="w-5 h-5 text-destructive"
									fill="none"
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									viewBox="0 0 24 24"
									stroke="currentColor"
									aria-hidden="true"
								>
									<path
										d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
									/>
								</svg>
							</div>
							<div class="flex-1">
								<h3 class="font-semibold text-destructive mb-1">
									Failed to render sheet music
								</h3>
								<p class="text-sm text-destructive/80">
									{{ failure.message }}
								</p>
							</div>
						</div>
					</div>
				}

				@if (isLoading() && !error()) {
					<div class="space-y-4">
						<div
							class="flex items-center justify-center gap-3 text-muted-foreground"
						>
							<svg
								class="animate-spin h-5 w-5"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								/>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								/>
							</svg>
							<span class="text-sm font-medium">Loading sheet music...</span>
						</div>
						<div appSkeleton class="w-full h-[400px] rounded-md"></div>
					</div>
				}

				<app-sheet-music
					[containerClass]="containerClass()"
					(renderComplete)="renderComplete.emit()"
					(renderError)="renderError.emit($event)"
				/>
			</div>
		</div>
	`,
})
export class SheetMusicDisplayComponent {
	/** MusicXML to render. Loading is triggered by a change to this input. */
	readonly musicXml = input.required<string>();

	/** Extra classes for the card. React's `className`. */
	readonly className = input("");

	readonly renderComplete = output<void>();
	readonly renderError = output<Error>();

	/**
	 * Optional, so the effect below can run before the view exists and
	 * simply re-run once it does -- `viewChild()` is a signal.
	 */
	private readonly sheet = viewChild(SheetMusicComponent);

	protected readonly isLoading = computed(
		() => this.sheet()?.isLoading() ?? false,
	);
	protected readonly error = computed(() => this.sheet()?.error() ?? null);

	/** React hid the container rather than unmounting it; so does this. */
	protected readonly containerClass = computed(() =>
		this.isLoading() || this.error() ? "min-h-[200px] hidden" : "min-h-[200px]",
	);

	constructor() {
		effect(() => {
			const sheet = this.sheet();
			const xml = this.musicXml();
			if (!sheet || !xml) return;
			void sheet.loadAndRender(xml);
		});
	}
}

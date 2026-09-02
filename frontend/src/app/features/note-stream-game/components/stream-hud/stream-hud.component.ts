import {
	ChangeDetectionStrategy,
	Component,
	computed,
	input,
} from "@angular/core";

import { CardDirective } from "../../../../shared/components/ui/card.directive";
import {
	MAX_MULTIPLIER,
	type NoteJudged,
	type StreamJudgment,
} from "../../models/note-stream.models";
import { HIT_LINE_X } from "../stream-staff/stream-staff.component";

/** Popup and live-region wording. One table, so both always agree. */
const JUDGMENT_LABELS: Record<StreamJudgment, string> = {
	perfect: "Perfect!",
	great: "Great",
	good: "Good",
	miss: "Miss",
};

/**
 * Judgment colour. Hits are the feedback green, misses the feedback red, and
 * Perfect is brass -- DESIGN.md gives scores and streaks to brass, and a
 * Perfect is the score the player is chasing.
 */
const JUDGMENT_COLORS: Record<StreamJudgment, string> = {
	perfect: "text-brass",
	great: "text-correct",
	good: "text-correct",
	miss: "text-destructive",
};

/**
 * The score strip above the scrolling staff.
 *
 * Quiet by design: card surface, ink text, one shadow. Brass carries the
 * score figure and nothing else, which is DESIGN.md's "scores/streaks" slot
 * spent once.
 *
 * The one deliberate exception is the **blue streak**. At the ×4 cap the
 * flame and multiplier badge switch to a saturated blue that appears nowhere
 * else in the app, so it reads as an event rather than as decoration. It is a
 * local custom property rather than a token precisely because nothing else
 * may reach for it.
 *
 * Everything arrives through inputs; the HUD holds no state and knows no
 * service.
 */
@Component({
	selector: "app-stream-hud",
	imports: [CardDirective],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: block;

			/*
			 * The blue streak. 4.1:1 against paper and 4.2:1 against charcoal,
			 * so one value clears the large-text threshold in both themes and
			 * no per-theme override is needed.
			 */
			--stream-blue: 217 85% 55%;
		}

		.stream-blue {
			color: hsl(var(--stream-blue));
		}

		.stream-flame svg {
			animation: stream-flicker 900ms ease-in-out infinite alternate;
			transform-origin: bottom center;
		}

		@keyframes stream-flicker {
			from {
				transform: scale(1);
			}
			to {
				transform: scale(1.14);
			}
		}

		/*
		 * Keyed on the note id by the @for below, so a second judgment on a new
		 * note replaces the element and restarts the animation. A plain @if
		 * would keep the node and the pop would fire only once.
		 */
		.stream-popup {
			animation: stream-popup 750ms ease-out forwards;
		}

		@keyframes stream-popup {
			0% {
				opacity: 0;
				transform: translate(-50%, 0.5rem) scale(0.85);
			}
			18% {
				opacity: 1;
				transform: translate(-50%, -0.15rem) scale(1.08);
			}
			55% {
				opacity: 1;
				transform: translate(-50%, -0.35rem) scale(1);
			}
			100% {
				opacity: 0;
				transform: translate(-50%, -1.4rem) scale(1);
			}
		}

		@media (prefers-reduced-motion: reduce) {
			.stream-flame svg {
				animation: none;
			}

			.stream-popup {
				animation: none;
				opacity: 1;
				transform: translateX(-50%);
			}
		}
	`,
	template: `
		<div
			appCard
			className="relative flex items-center justify-between gap-4 px-4 py-3 sm:px-6"
		>
			<p
				class="text-xs font-medium uppercase tracking-wide text-muted-foreground"
			>
				<span
					class="mr-2 block font-display text-4xl font-bold normal-case tracking-normal tabular-nums text-brass sm:text-5xl"
				>
					{{ score() }}
				</span>
				Points
			</p>

			<div class="flex items-center gap-3">
				<p [class]="streakClass()">
					<svg
						viewBox="0 0 24 24"
						class="h-5 w-5 sm:h-6 sm:w-6"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path
							d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5Z"
						/>
					</svg>
					<span
						class="font-display text-2xl font-bold tabular-nums sm:text-3xl"
					>
						{{ streak() }}
					</span>
					<span class="sr-only">note streak</span>
				</p>

				<p [class]="multiplierClass()">
					<span aria-hidden="true">×{{ multiplier() }}</span>
					<span class="sr-only">{{ multiplier() }} times multiplier</span>
				</p>
			</div>

			<!-- Anchored to the staff's hit line, so the label lands where the
			     note was judged. -->
			<div
				class="pointer-events-none absolute top-full z-10 mt-1 h-0"
				[style.left.px]="hitLineX"
			>
				@for (judged of popup(); track judged.note.id) {
					<span [class]="popupClass(judged.judgment)" aria-hidden="true">
						{{ label(judged.judgment) }}
					</span>
				}
			</div>

			<p class="sr-only" aria-live="polite">{{ liveMessage() }}</p>
		</div>
	`,
})
export class StreamHudComponent {
	readonly score = input.required<number>();
	readonly streak = input.required<number>();
	readonly multiplier = input.required<number>();
	/** The most recent judgment, or `null` before the first one. */
	readonly lastJudged = input<NoteJudged | null>(null);

	protected readonly hitLineX = HIT_LINE_X;

	/** At the cap the flame turns blue -- the one reward colour on the page. */
	protected readonly blazing = computed(
		() => this.multiplier() >= MAX_MULTIPLIER,
	);

	protected readonly streakClass = computed(() =>
		[
			"flex items-center gap-1.5",
			this.blazing() ? "stream-blue stream-flame" : "text-foreground",
		].join(" "),
	);

	protected readonly multiplierClass = computed(() =>
		[
			"rounded-full border-2 px-2.5 py-0.5 text-sm font-bold tabular-nums",
			this.blazing()
				? "stream-blue border-current"
				: "border-border text-muted-foreground",
		].join(" "),
	);

	/**
	 * Zero or one judgment, as a list. `@for` keyed on the note id is what
	 * retriggers the pop for every judgment, including two of the same kind
	 * back to back.
	 */
	protected readonly popup = computed<NoteJudged[]>(() => {
		const judged = this.lastJudged();
		return judged ? [judged] : [];
	});

	protected readonly liveMessage = computed(() => {
		const judged = this.lastJudged();
		return judged
			? `${JUDGMENT_LABELS[judged.judgment]} ${judged.note.name}`
			: "";
	});

	protected label(judgment: StreamJudgment): string {
		return JUDGMENT_LABELS[judgment];
	}

	protected popupClass(judgment: StreamJudgment): string {
		return `stream-popup absolute whitespace-nowrap font-display text-xl font-bold sm:text-2xl ${JUDGMENT_COLORS[judgment]}`;
	}
}

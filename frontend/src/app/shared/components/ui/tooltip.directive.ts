import {
	Directive,
	effect,
	ElementRef,
	inject,
	input,
	type OnDestroy,
} from "@angular/core";

/** Gap between host and bubble, and the viewport safety margin. */
const GAP_PX = 8;

/**
 * WCAG 2.1 SC 1.4.13 "hoverable": the pointer must be able to travel from
 * the host into the bubble without the bubble vanishing on the way.
 */
export const TOOLTIP_HIDE_DELAY_MS = 100;

/**
 * DESIGN.md rule 7: the bubble is ink on paper -- a `--primary` fill with
 * `--primary-foreground` text, never brass, no border and no shadow. Dark
 * mode flips it to a light fill on charcoal through the tokens alone, the
 * same figure/ground flip the selected chips make, so there is nothing
 * theme-specific to write here.
 *
 * Every static rule is a utility class; the only inline styles this
 * directive writes are the `top`/`left` it computes from
 * `getBoundingClientRect`.
 */
const BUBBLE_CLASSES =
	"fixed z-50 max-w-[16rem] whitespace-normal rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground pointer-events-auto";

let nextTooltipId = 0;

/**
 * `<button appTooltip="Play the exercise">` -- the shared label bubble
 * DESIGN.md rule 7 requires on every icon-only control, written for
 * EN 301 549 / WCAG 2.1 AA.
 *
 * ```html
 * <app-button appTooltip="Replay" size="icon" ariaLabel="Replay">…</app-button>
 * ```
 *
 * The three conformance points it exists to satisfy, all of SC 1.4.13
 * (content on hover or focus):
 *
 * - **Dismissable.** Escape closes the bubble without moving the pointer or
 *   the focus. The `keydown` listener is added on show and removed on hide,
 *   so a page of tooltips costs one listener while one is open, not one per
 *   host forever.
 * - **Hoverable.** Leaving the host starts a {@link TOOLTIP_HIDE_DELAY_MS}
 *   timer instead of hiding, and entering the bubble cancels it -- a user
 *   who needs to magnify the text can put the pointer on it.
 * - **Persistent.** Nothing but Escape, blur, or the pointer leaving both
 *   the host and the bubble takes it away; it has no timeout of its own.
 *
 * Focus shows the bubble only when the focus is `:focus-visible`, on the
 * host or anywhere inside it (on a boxless kit host the focused element is
 * the rendered child), so a mouse click on the control does not leave a
 * bubble stuck behind the pointer. An empty or whitespace-only label
 * leaves the directive inert.
 *
 * The listeners sit on the host, but the *anchor* -- what the bubble
 * measures against and what carries `aria-describedby` -- may be the host's
 * rendered child; see {@link TooltipDirective.resolveAnchor}.
 *
 * The bubble is a plain DOM node appended to `document.body` -- created on
 * first show, never before -- rather than a projected template. That keeps
 * it out of every stacking and `overflow: hidden` context on the page
 * (there is no CDK portal in this app; `DialogComponent` records the same
 * constraint), and `fixed` positioning means it can never move the layout
 * it is describing. This app is zoneless, so nothing here waits on change
 * detection.
 *
 * `ngOnDestroy` is the legitimate kind: DOM and listener teardown, not
 * unsubscribe bookkeeping.
 */
@Directive({
	selector: "[appTooltip]",
	host: {
		"(mouseenter)": "show()",
		"(mouseleave)": "scheduleHide()",
		"(focusin)": "onFocusIn()",
		"(focusout)": "hide()",
	},
})
export class TooltipDirective implements OnDestroy {
	/** The label. Empty or whitespace-only leaves the directive inert. */
	readonly appTooltip = input("");

	private readonly host = inject(ElementRef<HTMLElement>).nativeElement;
	private readonly bubbleId = `app-tooltip-${nextTooltipId++}`;

	private bubble: HTMLElement | null = null;
	private hideTimer: ReturnType<typeof setTimeout> | null = null;
	/** The element described while visible, and its own prior value. */
	private describedTarget: HTMLElement | null = null;
	private describedBy: string | null = null;

	constructor() {
		// The nav toggles flip their label on click ("Open friends" ->
		// "Close friends") while the bubble is still open, and a bubble
		// describing the state the click just left is worse than none.
		effect(() => {
			const text = this.appTooltip().trim();
			const bubble = this.bubble;
			if (!bubble) return;
			if (!text) {
				this.hide();
				return;
			}
			bubble.textContent = text;
			this.place(bubble, this.resolveAnchor());
		});
	}

	ngOnDestroy(): void {
		this.hide();
	}

	protected show(): void {
		this.clearHideTimer();
		const text = this.appTooltip().trim();
		if (!text || this.bubble) return;

		const bubble = document.createElement("div");
		bubble.id = this.bubbleId;
		bubble.setAttribute("role", "tooltip");
		bubble.className = BUBBLE_CLASSES;
		bubble.textContent = text;
		bubble.addEventListener("mouseenter", this.onBubbleEnter);
		bubble.addEventListener("mouseleave", this.onBubbleLeave);
		document.body.appendChild(bubble);
		this.bubble = bubble;

		const anchor = this.resolveAnchor();
		this.place(bubble, anchor);

		this.describedTarget = anchor;
		this.describedBy = anchor.getAttribute("aria-describedby");
		anchor.setAttribute(
			"aria-describedby",
			this.describedBy ? `${this.describedBy} ${this.bubbleId}` : this.bubbleId,
		);

		document.addEventListener("keydown", this.onDocumentKeydown);
		window.addEventListener("scroll", this.onViewportChange, true);
		window.addEventListener("resize", this.onViewportChange);
	}

	protected hide(): void {
		this.clearHideTimer();
		const bubble = this.bubble;
		if (!bubble) return;
		this.bubble = null;

		bubble.removeEventListener("mouseenter", this.onBubbleEnter);
		bubble.removeEventListener("mouseleave", this.onBubbleLeave);
		bubble.remove();

		if (this.describedTarget) {
			if (this.describedBy === null) {
				this.describedTarget.removeAttribute("aria-describedby");
			} else {
				this.describedTarget.setAttribute("aria-describedby", this.describedBy);
			}
		}
		this.describedTarget = null;
		this.describedBy = null;

		document.removeEventListener("keydown", this.onDocumentKeydown);
		window.removeEventListener("scroll", this.onViewportChange, true);
		window.removeEventListener("resize", this.onViewportChange);
	}

	/** SC 1.4.13 hoverable: leaving the host is a grace period, not a hide. */
	protected scheduleHide(): void {
		if (!this.bubble) return;
		this.clearHideTimer();
		this.hideTimer = setTimeout(() => this.hide(), TOOLTIP_HIDE_DELAY_MS);
	}

	protected onFocusIn(): void {
		if (this.isFocusVisible()) this.show();
	}

	/**
	 * `:focus-visible` matches only the element that actually holds the
	 * focus. On a `display: contents` kit host (`<app-button appTooltip>`)
	 * that is the rendered child, never the host the listener sits on, so
	 * the host check alone would miss every wrapped control. The
	 * `querySelector` leg asks "is the visible focus anywhere inside" and
	 * covers any nesting depth, which `resolveAnchor()`'s first-child rule
	 * would not.
	 *
	 * A selector engine that does not know `:focus-visible` throws
	 * `SyntaxError` rather than returning false, and that is a rendering
	 * environment, not a user intent. A focus we cannot classify counts as a
	 * keyboard focus -- the accessible failure direction is showing the
	 * label, not hiding it.
	 */
	private isFocusVisible(): boolean {
		try {
			return (
				this.host.matches(":focus-visible") ||
				this.host.querySelector(":focus-visible") !== null
			);
		} catch {
			return true;
		}
	}

	/**
	 * The host is not always a box. `<app-button>` and 26 other kit
	 * components set `:host { display: contents }` (frontend/CLAUDE.md), so
	 * the host element generates no box at all: its rect is all zeros, and
	 * an `aria-describedby` on it would sit on a wrapper the accessibility
	 * tree never renders. In that case the host's rendered child is the real
	 * control, and it is what the bubble measures against and describes.
	 * The listeners stay on the host either way -- pointer and focus events
	 * propagate through a `display: contents` ancestor normally.
	 */
	private resolveAnchor(): HTMLElement {
		const child = this.host.firstElementChild;
		if (!(child instanceof HTMLElement)) return this.host;

		const rect = this.host.getBoundingClientRect();
		if (rect.width === 0 && rect.height === 0) return child;

		return getComputedStyle(this.host).display === "contents"
			? child
			: this.host;
	}

	/** Centered above the anchor, flipped below when there is no room. */
	private place(bubble: HTMLElement, anchorEl: HTMLElement): void {
		const anchor = anchorEl.getBoundingClientRect();
		const size = bubble.getBoundingClientRect();

		const above = anchor.top - size.height - GAP_PX;
		const top = above >= GAP_PX ? above : anchor.bottom + GAP_PX;
		const centered = anchor.left + anchor.width / 2 - size.width / 2;
		const left = Math.max(
			GAP_PX,
			Math.min(centered, window.innerWidth - size.width - GAP_PX),
		);

		bubble.style.top = `${top}px`;
		bubble.style.left = `${left}px`;
	}

	private clearHideTimer(): void {
		if (this.hideTimer === null) return;
		clearTimeout(this.hideTimer);
		this.hideTimer = null;
	}

	private readonly onBubbleEnter = (): void => this.clearHideTimer();
	private readonly onBubbleLeave = (): void => this.scheduleHide();
	private readonly onViewportChange = (): void => this.hide();

	/** SC 1.4.13 dismissable, registered only while the bubble is up. */
	private readonly onDocumentKeydown = (event: KeyboardEvent): void => {
		if (event.key === "Escape") this.hide();
	};
}

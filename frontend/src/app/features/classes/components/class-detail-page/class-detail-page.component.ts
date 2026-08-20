import { Component, input } from "@angular/core";

/**
 * Phase 1 placeholder. It exists so `/classes/:id` resolves, so its guard runs,
 * and so the phase that owns this page has a component already wired into
 * the route table to fill in. See .migration/phase-1-handoff.md.
 */

@Component({
	selector: "app-class-detail-page",
	templateUrl: "./class-detail-page.component.html",
})
export class ClassDetailPageComponent {
	/**
	 * Bound from the `:id` route parameter by `withComponentInputBinding()`
	 * -- the half of PLAN.md 5.2's parameterized `rxResource` that the page
	 * owning this route will read.
	 */
	readonly id = input.required<string>();
}

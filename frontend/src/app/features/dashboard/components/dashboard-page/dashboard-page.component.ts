import { Component } from "@angular/core";

/**
 * Phase 1 placeholder. It exists so `/dashboard` resolves, so its guard runs,
 * and so the phase that owns this page has a component already wired into
 * the route table to fill in. See .migration/phase-1-handoff.md.
 */

@Component({
	selector: "app-dashboard-page",
	templateUrl: "./dashboard-page.component.html",
})
export class DashboardPageComponent {}

import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
} from "@angular/core";
import { NgIcon } from "@ng-icons/core";

import { AuthStore } from "../../../../auth/services/auth.store";
import { CARD_DIRECTIVES } from "../../../../shared/components/ui/card.directive";

/**
 * One of the six "proposed feature" cards. React repeated the same six-line
 * block six times; the shape is identical every time, so it is data here.
 *
 * The class strings are literals rather than something built from `tone`:
 * Tailwind scans `src/**\/*.{ts,html}`, so a literal in this file is found,
 * but a runtime-assembled `` `bg-${tone}/10` `` never would be.
 */
interface FeatureCard {
	icon: string;
	iconWrapperClass: string;
	iconClass: string;
	title: string;
	items: readonly string[];
}

/**
 * Profile. Port of frontend-react/src/pages/ProfilePage.tsx.
 *
 * Everything on it comes from the session -- name, email and role are read
 * off `AuthStore`, exactly as React read them off the Zustand store, and
 * the rest of the page is a list of features that do not exist yet. **No
 * `rxResource` here, deliberately: this page fetches nothing.** The one
 * profile endpoint the Go service exposes
 * (`UserService.getProfile`) is the dashboard's, not this page's -- see
 * phase-3-subfeature-3-handoff.md.
 */
@Component({
	selector: "app-profile-page",
	imports: [NgIcon, ...CARD_DIRECTIVES],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./profile-page.component.html",
})
export class ProfilePageComponent {
	private readonly store = inject(AuthStore);

	readonly user = this.store.user;

	/** `"STUDENT"` -> `"Student"`, as React's inline expression did. */
	readonly roleLabel = computed(() => {
		const role = this.user()?.role ?? "";
		return role.charAt(0) + role.slice(1).toLowerCase();
	});

	/**
	 * `charAt(0)`, not `[0]`: `noUncheckedIndexedAccess` types the index
	 * access `string | undefined`, and an empty name should render nothing
	 * rather than "undefined".
	 */
	readonly initials = computed(() => {
		const user = this.user();
		if (!user) return "";
		return user.firstName.charAt(0) + user.lastName.charAt(0);
	});

	readonly featureCards: readonly FeatureCard[] = [
		{
			icon: "lucideUser",
			iconWrapperClass: "rounded-lg bg-primary/10 p-2",
			iconClass: "text-primary",
			title: "Personal Information",
			items: [
				"Edit name and avatar",
				"Update email address",
				"Set school affiliation",
				"Choose primary instrument",
				"Select grade level (students)",
			],
		},
		{
			icon: "lucideMusic",
			iconWrapperClass: "rounded-lg bg-brass/10 p-2",
			iconClass: "text-brass",
			title: "Practice Preferences",
			items: [
				"Set default game mode",
				"Choose preferred scales",
				"Select difficulty level",
				"Configure notifications",
				"Set practice reminders",
			],
		},
		{
			icon: "lucideTarget",
			iconWrapperClass: "rounded-lg bg-primary/10 p-2",
			iconClass: "text-primary",
			title: "Practice Goals",
			items: [
				"Set weekly session targets",
				"Track accuracy goals",
				"Monitor speed improvements",
				"Build practice streaks",
				"Celebrate milestones",
			],
		},
		{
			icon: "lucideAward",
			iconWrapperClass: "rounded-lg bg-brass/10 p-2",
			iconClass: "text-brass",
			title: "Achievements & Badges",
			items: [
				"First Session badge",
				"Perfect Score achievements",
				"Speed Demon milestone",
				"Consistency rewards",
				"Scale Master completion",
			],
		},
		{
			icon: "lucideTrendingUp",
			iconWrapperClass: "rounded-lg bg-primary/10 p-2",
			iconClass: "text-primary",
			title: "Detailed Statistics",
			items: [
				"All-time performance stats",
				"Performance by scale",
				"Performance by octave",
				"Strongest/weakest areas",
				"Practice streak tracking",
			],
		},
		{
			icon: "lucideSchool",
			iconWrapperClass: "rounded-lg bg-brass/10 p-2",
			iconClass: "text-brass",
			title: "Connections",
			items: [
				"Link with teachers",
				"Connect parent accounts",
				"Manage student access",
				"Share progress reports",
				"Collaborate on goals",
			],
		},
	];
}

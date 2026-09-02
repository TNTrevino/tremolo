import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	signal,
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { RouterLink } from "@angular/router";
import { NgIcon } from "@ng-icons/core";

import { AppErrorComponent } from "../../../../core/components/app-error/app-error.component";
import type { Assignment, Class } from "../../models/classes.models";
import { ClassesService } from "../../services/classes.service";
import { AssignmentResultsGridComponent } from "../assignment-results-grid/assignment-results-grid.component";
import { ClassAssignmentsListComponent } from "../class-assignments-list/class-assignments-list.component";
import { ClassHeaderComponent } from "../class-header/class-header.component";
import { RosterListComponent } from "../roster-list/roster-list.component";

/**
 * `/classes/:id` -- one class: its header, roster, assignments, and (once a
 * teacher picks one) that assignment's results. Port of
 * frontend-react/src/pages/ClassDetailPage.tsx.
 *
 * **There is no GET-by-id for a class**, so this fetches the teacher's list
 * and finds the row, exactly as React did. That is a real endpoint gap, not
 * a porting shortcut -- if a by-id endpoint ever lands, this is the page
 * that should stop over-fetching.
 *
 * `id` arrives as a string from `withComponentInputBinding()`; a
 * non-numeric one produces `NaN`, which matches nothing and lands on the
 * not-found branch. React had the same `Number.isNaN` guard.
 *
 * The template gates its spinner on `status() === "loading"`, **not** on
 * `isLoading()`. Angular's `isLoading()` is also true while *reloading*,
 * where TanStack's `isLoading` (`isPending && isFetching`) is first-load
 * only. Using `isLoading()` here made `onRosterChanged()` tear the whole
 * body down -- which also destroyed `<app-roster-list>` mid-flight and
 * cancelled the very roster refetch that triggered it. Every resource in
 * this feature that something calls `.reload()` on follows the same rule.
 */
@Component({
	selector: "app-class-detail-page",
	imports: [
		AppErrorComponent,
		AssignmentResultsGridComponent,
		ClassAssignmentsListComponent,
		ClassHeaderComponent,
		NgIcon,
		RosterListComponent,
		RouterLink,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./class-detail-page.component.html",
})
export class ClassDetailPageComponent {
	readonly id = input.required<string>();

	private readonly classesService = inject(ClassesService);

	readonly classId = computed(() => Number(this.id()));

	readonly classes = rxResource({
		stream: () => this.classesService.getTeacherClasses(),
		defaultValue: [] as Class[],
	});

	/**
	 * `value()` rethrows on a failed resource, so a failed list would take
	 * the whole page down through the template. The error arm renders
	 * `<app-error>`; this keeps the computed from throwing before it gets
	 * there.
	 */
	readonly classItem = computed(() => {
		const id = this.classId();
		if (Number.isNaN(id)) return undefined;
		const classes = this.classes.error() ? [] : this.classes.value();
		return classes.find((c) => c.id === id);
	});

	readonly selected = signal<Assignment | null>(null);

	onSelect(assignment: Assignment): void {
		this.selected.set(assignment);
	}

	/** The roll changed, so the header's `student_count` is stale. */
	onRosterChanged(): void {
		this.classes.reload();
	}
}

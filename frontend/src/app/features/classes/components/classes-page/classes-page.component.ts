import {
	ChangeDetectionStrategy,
	Component,
	inject,
	signal,
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import { NgIcon } from "@ng-icons/core";

import { AppErrorComponent } from "../../../../core/components/app-error/app-error.component";
import { ButtonComponent } from "../../../../shared/components/ui/button.component";
import { CARD_DIRECTIVES } from "../../../../shared/components/ui/card.directive";
import { SkeletonDirective } from "../../../../shared/components/ui/skeleton.directive";
import { ClassesService } from "../../services/classes.service";
import { ClassCardComponent } from "../class-card/class-card.component";
import { CreateClassDialogComponent } from "../create-class-dialog/create-class-dialog.component";

/**
 * `/classes` -- the teacher's class list. Port of
 * frontend-react/src/pages/ClassesPage.tsx together with the `MyClassesView`
 * it wrapped; React split them only so the page could stay a thin route
 * component, and there is nothing else on this page.
 *
 * The `rxResource` here is PLAN.md §5.2 verbatim: fetch on load, no cache
 * (D6), and the template block below **is** the old `QueryState` component
 * -- loading, error, empty, content, in that order.
 *
 * Creating a class calls `classes.reload()`. That is the port of TanStack's
 * `invalidateQueries(teacherList())`: a refetch, not a cache write. The new
 * class arrives on the `created` output too, but it is deliberately not
 * spliced into `classes.value()` -- the server owns `student_count` and the
 * join code, so the list it sends back is the truth.
 *
 * Contracts the parity suite selects on: heading "My Classes", the "New
 * class" button, and (through `app-class-card`) "Copy join code".
 */
@Component({
	selector: "app-classes-page",
	imports: [
		AppErrorComponent,
		ButtonComponent,
		ClassCardComponent,
		CreateClassDialogComponent,
		NgIcon,
		SkeletonDirective,
		...CARD_DIRECTIVES,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./classes-page.component.html",
})
export class ClassesPageComponent {
	private readonly classesService = inject(ClassesService);

	readonly classes = rxResource({
		stream: () => this.classesService.getTeacherClasses(),
		defaultValue: [],
	});

	readonly isCreateOpen = signal(false);

	/** Three skeleton cards, the count React's loading branch rendered. */
	readonly skeletons = [0, 1, 2];

	onCreated(): void {
		this.classes.reload();
	}
}

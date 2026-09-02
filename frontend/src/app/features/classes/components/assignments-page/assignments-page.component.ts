import { ChangeDetectionStrategy, Component } from "@angular/core";

import { JoinClassCardComponent } from "../join-class-card/join-class-card.component";
import { StudentAssignmentsListComponent } from "../student-assignments-list/student-assignments-list.component";

/**
 * `/assignments` -- the student-facing page: join a class by code and see
 * assigned practice with progress against each assignment's (advisory)
 * target. Port of frontend-react/src/pages/AssignmentsPage.tsx.
 *
 * The heading is **"Assignments"** and the card below it is "My
 * Assignments"; the parity suite asks for the first with `exact: true`
 * precisely so the two do not collide.
 */
@Component({
	selector: "app-assignments-page",
	imports: [JoinClassCardComponent, StudentAssignmentsListComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./assignments-page.component.html",
})
export class AssignmentsPageComponent {}

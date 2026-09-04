import {
	ChangeDetectionStrategy,
	Component,
	inject,
	output,
	signal,
} from "@angular/core";
import { rxResource } from "@angular/core/rxjs-interop";
import {
	applyWhen,
	form,
	FormField,
	maxLength,
	validateStandardSchema,
} from "@angular/forms/signals";
import { NgIcon } from "@ng-icons/core";
import { z } from "zod";

import { FormFieldComponent } from "../../../../shared/components/forms/form-field.component";
import { FormInputDirective } from "../../../../shared/components/forms/form-input.directive";
import { ButtonComponent } from "../../../../shared/components/ui/button.component";
import { CARD_DIRECTIVES } from "../../../../shared/components/ui/card.directive";
import { SkeletonDirective } from "../../../../shared/components/ui/skeleton.directive";
import { getErrorMessage } from "../../../../shared/utils/error.utils";
import type { StudentClass } from "../../models/classes.models";
import { ClassesService } from "../../services/classes.service";

export const joinClassSchema = z.object({
	joinCode: z.string().min(1, "Enter a class code"),
});

export type JoinClassFormData = z.infer<typeof joinClassSchema>;

/**
 * Port of frontend-react/src/features/classes/components/JoinClassCard.tsx:
 * the student's join-by-code form, plus the list of classes they are in.
 *
 * **The join error is shown inline, never as a toast.** React said so with
 * `meta: { suppressErrorToast: true }` on the mutation, and a React test
 * pins it: a wrong code is a 404 whose body the student needs to read next
 * to the field they just typed in, not a corner notification. The Angular
 * shape is the same one every other mutation here uses -- the error arm --
 * it just writes into a signal instead of calling `showError`.
 *
 * Contracts the parity suite selects on: the label "Class code" and the
 * button "Join" (`exact: true`, which is why the card's title is "Join a
 * class" and the button is the bare word).
 */
@Component({
	selector: "app-join-class-card",
	imports: [
		ButtonComponent,
		FormField,
		FormFieldComponent,
		FormInputDirective,
		NgIcon,
		SkeletonDirective,
		...CARD_DIRECTIVES,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: block;
		}
	`,
	templateUrl: "./join-class-card.component.html",
})
export class JoinClassCardComponent {
	/** Raised after a successful join, for anything else on the page. */
	readonly joined = output<StudentClass>();

	private readonly classesService = inject(ClassesService);

	private readonly formModel = signal<JoinClassFormData>({ joinCode: "" });

	/** The class just joined, and the reason the success banner is up. */
	readonly justJoined = signal<StudentClass | null>(null);

	readonly joinForm = form(this.formModel, (path) => {
		// The required rule is suspended while the success banner is up.
		// A join empties the field; the card stays on screen, so the next
		// blur marks the now-empty field touched and Signal Forms would
		// render "Enter a class code" above "Joined ..." -- and the
		// placeholder is itself a plausible six-character code, so the box
		// looks full while it scolds (#298). `submit()` retires the banner
		// before it reads `invalid()`, so pressing Join on an empty field
		// still gets the message.
		applyWhen(
			path,
			() => this.justJoined() === null,
			(joined) => {
				validateStandardSchema(joined, joinClassSchema);
			},
		);
		// React wrote `maxLength={6}` on the input. Signal Forms owns the
		// validation attributes on a `[formField]` element (NG8022 refuses a
		// hand-written one), so the cap is declared here and the directive
		// renders the attribute.
		maxLength(path.joinCode, 6);
	});

	readonly classes = rxResource({
		stream: () => this.classesService.getStudentClasses(),
		defaultValue: [] as StudentClass[],
	});

	readonly pending = signal(false);
	readonly serverError = signal<string | null>(null);

	// The template binds both `[error]="serverError()"` and
	// `[field]="joinForm.joinCode"` on the field. `app-form-field` gives
	// `error` precedence and falls through to the field's own message when it
	// is null, which is React's
	// `errors.joinCode?.message ?? getErrorMessage(join.error)` ladder.

	submit(event: Event): void {
		event.preventDefault();
		if (this.pending()) return;

		// Retire the banner first: it is what suspends the required rule, so
		// it has to be gone before the form's validity is read.
		this.justJoined.set(null);
		this.joinForm().markAsTouched();
		if (this.joinForm().invalid()) return;

		this.serverError.set(null);
		this.pending.set(true);

		this.classesService.joinClass(this.formModel().joinCode.trim()).subscribe({
			next: (studentClass) => {
				this.pending.set(false);
				this.justJoined.set(studentClass);
				this.joinForm().reset({ joinCode: "" });
				// React invalidated the student class list here; a resource
				// refetches instead (D6).
				this.classes.reload();
				this.joined.emit(studentClass);
			},
			error: (err: unknown) => {
				this.pending.set(false);
				this.serverError.set(getErrorMessage(err));
			},
		});
	}
}

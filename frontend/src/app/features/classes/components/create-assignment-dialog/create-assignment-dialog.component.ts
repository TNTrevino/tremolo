import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	model,
	output,
	signal,
} from "@angular/core";
import {
	form,
	FormField,
	validateStandardSchema,
} from "@angular/forms/signals";
import { z } from "zod";

import { NotificationService } from "../../../../core/services/notification.service";
import { FormFieldComponent } from "../../../../shared/components/forms/form-field.component";
import { FormInputDirective } from "../../../../shared/components/forms/form-input.directive";
import { ButtonComponent } from "../../../../shared/components/ui/button.component";
import { DIALOG_DIRECTIVES } from "../../../../shared/components/ui/dialog.component";
import { SelectComponent } from "../../../../shared/components/ui/select.component";
import type { GameType } from "../../../../shared/models/game.types";
import { getErrorMessage } from "../../../../shared/utils/error.utils";
import type {
	Assignment,
	CreateAssignmentRequest,
} from "../../models/classes.models";
import {
	defaultAssignmentConfig,
	GAME_TYPE_LABELS,
	GAME_TYPE_OPTIONS,
} from "../../models/game-definitions";
import { ClassesService } from "../../services/classes.service";

/**
 * The title is the only thing React validated in TypeScript; its `min`/`max`
 * on the two target inputs were native constraints, which Signal Forms
 * refuses to let a template write on a `[formField]` element (NG8022). Both
 * targets are optional strings on the way in, so the same bounds are stated
 * here as refinements and now come with a message instead of a browser
 * tooltip.
 */
const optionalNumber = (label: string, min: number, max?: number) =>
	z.string().refine(
		(raw) => {
			if (!raw.trim()) return true;
			const value = Number(raw);
			return (
				Number.isFinite(value) &&
				value >= min &&
				(max === undefined || value <= max)
			);
		},
		max === undefined
			? `${label} must be ${min} or more`
			: `${label} must be between ${min} and ${max}`,
	);

export const createAssignmentSchema = z.object({
	title: z.string().trim().min(1, "Title is required"),
	dueAt: z.string(),
	targetQuestions: optionalNumber("Target questions", 1),
	targetAccuracy: optionalNumber("Target accuracy", 1, 100),
});

export type CreateAssignmentFormData = z.infer<typeof createAssignmentSchema>;

/**
 * Port of
 * frontend-react/src/features/classes/components/CreateAssignmentDialog.tsx.
 *
 * **Scope boundary.** React's dialog embedded each game's own settings UI
 * (`SettingsControls`, `GameModeLimitControls`, `StaffRangePicker`) so a
 * teacher could tune the frozen config before creating the assignment.
 * Those controls are the game engine's (Phase 5) and the note game's
 * (Phase 6); this slice ports everything around them and freezes the
 * chosen game's **defaults** as the config, which is what React froze when
 * a teacher touched nothing. `defaultAssignmentConfig()` carries those
 * defaults and names the phase that has to replace it.
 *
 * `gameType` and `config` stay plain signals rather than form fields: the
 * config is an opaque JSONB blob, not something zod has an opinion about,
 * and switching games snapshots the new game's defaults rather than
 * migrating the old ones -- the same reset React did in `changeGameType`.
 */
@Component({
	selector: "app-create-assignment-dialog",
	imports: [
		ButtonComponent,
		FormField,
		FormFieldComponent,
		FormInputDirective,
		SelectComponent,
		...DIALOG_DIRECTIVES,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	styles: `
		:host {
			display: contents;
		}
	`,
	templateUrl: "./create-assignment-dialog.component.html",
})
export class CreateAssignmentDialogComponent {
	readonly classId = input.required<number>();
	readonly open = model.required<boolean>();

	readonly created = output<Assignment>();

	private readonly classesService = inject(ClassesService);
	private readonly notifications = inject(NotificationService);

	readonly gameTypeOptions = GAME_TYPE_OPTIONS;

	private readonly formModel = signal<CreateAssignmentFormData>({
		title: "",
		dueAt: "",
		targetQuestions: "",
		targetAccuracy: "",
	});

	readonly assignmentForm = form(this.formModel, (path) => {
		validateStandardSchema(path, createAssignmentSchema);
	});

	readonly gameType = signal<GameType>("note");
	readonly config = signal<Record<string, unknown>>(
		defaultAssignmentConfig("note"),
	);
	readonly pending = signal(false);

	readonly gameLabel = computed(() => GAME_TYPE_LABELS[this.gameType()]);

	changeGameType(value: string): void {
		const next = value as GameType;
		this.gameType.set(next);
		// Switching games snapshots that game's own defaults as the config.
		this.config.set(defaultAssignmentConfig(next));
	}

	close(): void {
		this.assignmentForm().reset({
			title: "",
			dueAt: "",
			targetQuestions: "",
			targetAccuracy: "",
		});
		this.gameType.set("note");
		this.config.set(defaultAssignmentConfig("note"));
		this.pending.set(false);
		this.open.set(false);
	}

	submit(event: Event): void {
		event.preventDefault();
		if (this.pending()) return;

		this.assignmentForm().markAsTouched();
		if (this.assignmentForm().invalid()) return;

		const values = this.formModel();
		const request: CreateAssignmentRequest = {
			title: values.title.trim(),
			game_type: this.gameType(),
			config: this.config(),
			due_at: values.dueAt ? new Date(values.dueAt).toISOString() : null,
			target_questions: values.targetQuestions.trim()
				? Number(values.targetQuestions)
				: null,
			target_accuracy: values.targetAccuracy.trim()
				? Number(values.targetAccuracy)
				: null,
		};

		this.pending.set(true);

		this.classesService.createAssignment(this.classId(), request).subscribe({
			next: (assignment) => {
				this.created.emit(assignment);
				this.close();
			},
			error: (err: unknown) => {
				this.pending.set(false);
				this.notifications.showError(
					getErrorMessage(err),
					"Failed to create assignment",
				);
			},
		});
	}
}

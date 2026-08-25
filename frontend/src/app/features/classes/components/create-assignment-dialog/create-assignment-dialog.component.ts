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

import type { BaseGameSettings } from "@features/identification-game/data";
// Deep-imported, not from the `@features/identification-game` barrel: the
// barrel also re-exports `GameStaffComponent`, which reaches
// `opensheetmusicdisplay`, a ~1 MB engraver. This dialog only wants two
// settings controls, so importing them by path keeps that engraver out of
// the classes bundle chunk. Same reasoning as the `/data` entry-point
// comment on `../../models/game-definitions.ts:1-5`; see also
// `frontend/CLAUDE.md`, "Barrel vs data entry point".
import { GameModeLimitControlsComponent } from "@features/identification-game/settings/game-mode-limit-controls.component";
import { SettingsControlsComponent } from "@features/identification-game/settings/settings-controls.component";
import { NoteRangeSettingComponent } from "@features/note-game/components/note-range-setting/note-range-setting.component";
import {
	SCALES,
	type GameSettings,
} from "@features/note-game/models/note-game.models";

import { NotificationService } from "../../../../core/services/notification.service";
import { FormFieldComponent } from "../../../../shared/components/forms/form-field.component";
import { FormInputDirective } from "../../../../shared/components/forms/form-input.directive";
import { ButtonComponent } from "../../../../shared/components/ui/button.component";
import { DIALOG_DIRECTIVES } from "../../../../shared/components/ui/dialog.component";
import { SelectComponent } from "../../../../shared/components/ui/select.component";
import type { GameType } from "../../../../shared/models/game.models";
import { getErrorMessage } from "../../../../shared/utils/error.utils";
import type {
	Assignment,
	CreateAssignmentRequest,
} from "../../models/classes.models";
import {
	defaultGameSettings,
	GAME_TYPE_LABELS,
	GAME_TYPE_OPTIONS,
	settingsSchemaFor,
	toAssignmentConfig,
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
 * React's dialog embedded each game's own settings UI (`SettingsControls`,
 * `GameModeLimitControls`, `NoteRangeSetting`) so a teacher could tune the
 * frozen config before creating the assignment. Issue #261 closed that gap:
 * `gameSettings` holds the live, always-camelCase settings a teacher is
 * tuning; `config` freezes them into the blob the request actually sends.
 * The two are deliberately different signals -- the settings controls patch
 * `gameSettings` the same way they patch a live game's settings, and the
 * snake_case conversion for the note game happens once, in
 * `toAssignmentConfig`, not in the dialog.
 *
 * `gameType` and `gameSettings` stay plain signals rather than form fields:
 * the config is an opaque JSONB blob, not something zod has an opinion
 * about, and switching games reseeds the new game's own defaults rather
 * than migrating the old settings -- the same reset React did in
 * `changeGameType`.
 */
@Component({
	selector: "app-create-assignment-dialog",
	imports: [
		ButtonComponent,
		FormField,
		FormFieldComponent,
		FormInputDirective,
		GameModeLimitControlsComponent,
		NoteRangeSettingComponent,
		SelectComponent,
		SettingsControlsComponent,
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
	protected readonly scales = SCALES;

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

	/** The live settings a teacher is tuning -- always camelCase, unfrozen. */
	readonly gameSettings = signal<Record<string, unknown>>(
		defaultGameSettings("note"),
	);

	/** The frozen blob the request actually sends. */
	readonly config = computed(() =>
		toAssignmentConfig(this.gameType(), this.gameSettings()),
	);

	/** `null` for the note game, which has no schema -- see the template. */
	readonly settingsSchema = computed(() => settingsSchemaFor(this.gameType()));

	readonly pending = signal(false);

	readonly gameLabel = computed(() => GAME_TYPE_LABELS[this.gameType()]);

	protected readonly isNoteGame = computed(() => this.gameType() === "note");

	/** Cast for `<app-note-range-setting>` and the scale select; note game only. */
	protected readonly noteSettings = computed(
		() => this.gameSettings() as unknown as GameSettings,
	);

	/** Cast for `<app-game-mode-limit-controls>`; every game's settings have these. */
	protected readonly baseSettings = computed(
		() => this.gameSettings() as unknown as BaseGameSettings,
	);

	changeGameType(value: string): void {
		const next = value as GameType;
		this.gameType.set(next);
		// Switching games discards any tuning and reseeds that game's own
		// defaults.
		this.gameSettings.set(defaultGameSettings(next));
	}

	/** A partial patch from a settings control, merged over the live settings. */
	applySettings(patch: Record<string, unknown>): void {
		this.gameSettings.update((current) => ({ ...current, ...patch }));
	}

	resetSettings(): void {
		this.gameSettings.set(defaultGameSettings(this.gameType()));
	}

	close(): void {
		this.assignmentForm().reset({
			title: "",
			dueAt: "",
			targetQuestions: "",
			targetAccuracy: "",
		});
		this.gameType.set("note");
		this.gameSettings.set(defaultGameSettings("note"));
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

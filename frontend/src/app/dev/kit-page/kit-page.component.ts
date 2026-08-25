import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	signal,
	viewChild,
} from "@angular/core";
import {
	form,
	FormField,
	validateStandardSchema,
} from "@angular/forms/signals";
import { NgIcon } from "@ng-icons/core";

import { AppErrorComponent } from "../../core/components/app-error/app-error.component";
import { SheetMusicComponent } from "../../features/sheet-music/components/sheet-music/sheet-music.component";
import { ConfirmDialogComponent } from "../../core/components/confirm-dialog/confirm-dialog.component";
import { SpinnerComponent } from "../../core/components/spinner/spinner.component";
import { NotificationService } from "../../core/services/notification.service";
import { FormFieldComponent } from "../../shared/components/forms/form-field.component";
import { FormErrorComponent } from "../../shared/components/forms/form-error.component";
import { FormInputDirective } from "../../shared/components/forms/form-input.directive";
import { FormLabelComponent } from "../../shared/components/forms/form-label.component";
import { FormSelectDirective } from "../../shared/components/forms/form-select.directive";
import { RhythmGlyphComponent } from "../../shared/components/music/rhythm-glyph.component";
import {
	ButtonComponent,
	type ButtonSize,
	type ButtonVariant,
} from "../../shared/components/ui/button.component";
import { CARD_DIRECTIVES } from "../../shared/components/ui/card.directive";
import { DIALOG_DIRECTIVES } from "../../shared/components/ui/dialog.component";
import { InputDirective } from "../../shared/components/ui/input.directive";
import { LabelDirective } from "../../shared/components/ui/label.directive";
import { SelectComponent } from "../../shared/components/ui/select.component";
import { SkeletonDirective } from "../../shared/components/ui/skeleton.directive";
import {
	signupSchema,
	type SignupFormData,
} from "../../shared/validators/auth.schemas";
import type { ToastType } from "../../core/services/notification.service";

/** One whole note, so the OSMD demo needs no network. */
const KIT_MUSIC_XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
	<part-list>
		<score-part id="P1"><part-name>Kit</part-name></score-part>
	</part-list>
	<part id="P1">
		<measure number="1">
			<attributes>
				<divisions>1</divisions>
				<key><fifths>0</fifths></key>
				<time><beats>4</beats><beat-type>4</beat-type></time>
				<clef><sign>G</sign><line>2</line></clef>
			</attributes>
			<note>
				<pitch><step>C</step><octave>4</octave></pitch>
				<duration>4</duration>
				<type>whole</type>
			</note>
		</measure>
	</part>
</score-partwise>`;

/** Passes the converter page's checks and still fails OSMD's parser. */
const BROKEN_MUSIC_XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0"><part id="P1"><measure`;

/**
 * `/dev/kit` -- the shared UI kit, on one page.
 *
 * Not part of the product: it exists so a human (or a verifier) can see
 * every primitive in both themes at once, and so a regression in one of
 * them is visible without hunting through features. Deleting it is one
 * route entry in `app.routes.ts` plus this folder; nothing in the app
 * imports it.
 *
 * It is unguarded on purpose -- it renders nothing user-specific and
 * nothing it shows touches the API.
 */
@Component({
	selector: "app-kit-page",
	imports: [
		AppErrorComponent,
		ButtonComponent,
		ConfirmDialogComponent,
		FormField,
		FormErrorComponent,
		FormFieldComponent,
		FormInputDirective,
		FormLabelComponent,
		FormSelectDirective,
		InputDirective,
		LabelDirective,
		NgIcon,
		RhythmGlyphComponent,
		SelectComponent,
		SheetMusicComponent,
		SkeletonDirective,
		SpinnerComponent,
		...CARD_DIRECTIVES,
		...DIALOG_DIRECTIVES,
	],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./kit-page.component.html",
})
export class KitPageComponent {
	private readonly notifications = inject(NotificationService);

	protected readonly variants: ButtonVariant[] = [
		"default",
		"brass",
		"destructive",
		"outline",
		"secondary",
		"ghost",
		"link",
	];
	protected readonly sizes: ButtonSize[] = [
		"sm",
		"default",
		"lg",
		"xl",
		"icon",
	];
	protected readonly toastTypes: ToastType[] = [
		"success",
		"error",
		"warning",
		"info",
	];

	protected readonly dialogOpen = signal(false);
	protected readonly confirmOpen = signal(false);
	protected readonly confirmPending = signal(false);
	protected readonly plainSelect = signal("treble");
	protected readonly plainInput = signal("");

	/**
	 * The Signal Forms + zod round trip (D11), on the real signup schema:
	 * blur a field or press "Validate" and the zod message appears under
	 * it; fix the value and it clears. `confirmPassword` proves the
	 * cross-field case -- that message comes from the schema's `.refine`,
	 * not from a field rule.
	 */
	private readonly signupModel = signal<SignupFormData>({
		firstName: "",
		lastName: "",
		email: "",
		password: "",
		confirmPassword: "",
		role: "STUDENT",
		inviteCode: "",
	});

	protected readonly signupForm = form(this.signupModel, (path) => {
		validateStandardSchema(path, signupSchema);
	});

	protected showToast(type: ToastType): void {
		this.notifications.showToast(
			`This is a ${type} toast. It dismisses itself after five seconds.`,
			type,
			type[0]!.toUpperCase() + type.slice(1),
		);
	}

	protected validateSignup(): void {
		this.signupForm().markAsTouched();
	}

	protected resetSignup(): void {
		this.signupModel.set({
			firstName: "Ada",
			lastName: "Lovelace",
			email: "ada@tremolo.test",
			password: "Str0ng!pass",
			confirmPassword: "Str0ng!pass",
			role: "TEACHER",
			// The role above is TEACHER, and signupSchema requires a code
			// with it (#250) -- without one, "reset" would land the demo form
			// straight into an error state.
			inviteCode: "TREMOLO1",
		});
	}

	/**
	 * The OSMD wrapper, driven by hand.
	 *
	 * `<app-sheet-music>` is imperative -- `loadAndRender` and `clear` are
	 * methods, not inputs -- so this is where a human can see the three
	 * things a unit test can only assert about a mock: real MusicXML draws,
	 * `zoom` re-renders in place, and `clear` empties the container.
	 */
	private readonly sheet = viewChild.required(SheetMusicComponent);

	protected readonly zoomLevels = [1, 1.4, 2.2];
	protected readonly sheetZoom = signal("1");
	protected readonly zoom = computed(() => Number(this.sheetZoom()));
	protected readonly sheetStatus = signal("nothing loaded");

	protected loadSheet(): void {
		void this.sheet().loadAndRender(KIT_MUSIC_XML);
	}

	protected loadBrokenSheet(): void {
		void this.sheet().loadAndRender(BROKEN_MUSIC_XML);
	}

	protected clearSheet(): void {
		this.sheet().clear();
		this.sheetStatus.set("cleared");
	}

	protected confirmDestructive(): void {
		this.confirmPending.set(true);
		setTimeout(() => {
			this.confirmPending.set(false);
			this.confirmOpen.set(false);
			this.notifications.showSuccess("Pretend thing deleted.");
		}, 600);
	}
}

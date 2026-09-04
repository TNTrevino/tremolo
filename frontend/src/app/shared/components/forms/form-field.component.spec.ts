import { Component, signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import {
	form,
	FormField,
	validateStandardSchema,
} from "@angular/forms/signals";

import { loginSchema, type LoginFormData } from "../../validators/auth.schemas";
import { revealErrors } from "./field-error";
import { FormFieldComponent } from "./form-field.component";
import { FormInputDirective } from "./form-input.directive";

/**
 * The D11 round trip: a zod schema, `validateStandardSchema`, and the form
 * kit rendering what comes out. This is the spec Phase 3's auth screens
 * copy the pattern from.
 */
@Component({
	imports: [FormField, FormFieldComponent, FormInputDirective],
	template: `
		<app-form-field
			label="Email Address"
			htmlFor="email"
			[required]="true"
			[field]="loginForm.email"
		>
			<input
				appFormInput
				id="email"
				type="email"
				[formField]="loginForm.email"
			/>
		</app-form-field>
	`,
})
class HostComponent {
	readonly model = signal<LoginFormData>({ email: "", password: "" });
	readonly loginForm = form(this.model, (path) => {
		validateStandardSchema(path, loginSchema);
	});
}

describe("FormFieldComponent with a zod schema", () => {
	let fixture: ComponentFixture<HostComponent>;
	let host: HostComponent;

	beforeEach(async () => {
		fixture = TestBed.createComponent(HostComponent);
		host = fixture.componentInstance;
		await fixture.whenStable();
	});

	function input(): HTMLInputElement {
		return fixture.nativeElement.querySelector("input") as HTMLInputElement;
	}

	function errorText(): string | null {
		const el = fixture.nativeElement.querySelector("p.text-destructive");
		return el ? (el.textContent as string).trim() : null;
	}

	async function type(value: string): Promise<void> {
		input().value = value;
		input().dispatchEvent(new Event("input"));
		await fixture.whenStable();
	}

	/** What a visitor who tabs through a form does: focus, then leave. */
	async function blur(): Promise<void> {
		input().dispatchEvent(new Event("blur"));
		await fixture.whenStable();
	}

	it("labels the input, and marks it required", () => {
		const label = fixture.nativeElement.querySelector(
			"label",
		) as HTMLLabelElement;
		expect(label.htmlFor).toBe("email");
		expect(label.textContent).toContain("Email Address");
		expect(label.textContent).toContain("*");
	});

	it("stays quiet while the field is untouched, even when invalid", async () => {
		await type("not-an-email");

		expect(host.loginForm.email().invalid()).toBe(true);
		expect(errorText()).toBeNull();
	});

	/**
	 * #303. Signal Forms marks a field touched on **blur**, so a visitor who
	 * typed nothing and merely tabbed through `/signup` was handed four red
	 * lines under four empty boxes. Nothing they did was wrong yet.
	 */
	it("says nothing when an empty field is tabbed through", async () => {
		await blur();

		expect(host.loginForm.email().touched()).toBe(true);
		expect(host.loginForm.email().invalid()).toBe(true);
		expect(errorText()).toBeNull();
		expect(input().className).not.toContain("border-destructive");
		expect(input().getAttribute("aria-invalid")).toBeNull();
	});

	it("shows the schema's own message once a filled-in field is left", async () => {
		await type("not-an-email");
		await blur();

		expect(errorText()).toBe("Invalid email format");
		expect(input().className).toContain("border-destructive");
		expect(input().getAttribute("aria-invalid")).toBe("true");
	});

	/**
	 * The other half of #303: emptying a box the visitor did fill in is
	 * their own doing, so the field is entitled to say what is missing.
	 */
	it("speaks up again when a filled-in field is emptied", async () => {
		await type("sam@tremolo.test");
		await blur();
		expect(errorText()).toBeNull();

		await type("");

		expect(errorText()).toBe("Email is required");
	});

	it("clears the message as soon as the value is fixed", async () => {
		await type("not-an-email");
		host.loginForm.email().markAsTouched();
		await fixture.whenStable();
		expect(errorText()).toBe("Invalid email format");

		await type("sam@tremolo.test");

		expect(errorText()).toBeNull();
		expect(input().className).not.toContain("border-destructive");
		expect(host.loginForm().valid()).toBe(false); // password is still empty
	});

	it("moves what the user types into the model", async () => {
		await type("sam@tremolo.test");

		expect(host.model().email).toBe("sam@tremolo.test");
	});

	/**
	 * `markAsTouched()` alone is no longer enough to reveal a message, and
	 * that is the point: it is what a blur does. Submitting is the visitor
	 * asserting the form's contents, which is what `revealErrors` says.
	 */
	it("keeps an untouched field quiet under markAsTouched alone", async () => {
		host.loginForm().markAsTouched();
		await fixture.whenStable();

		expect(host.loginForm.email().touched()).toBe(true);
		expect(errorText()).toBeNull();
	});

	it("revealErrors on the root reveals every field at once", async () => {
		revealErrors(host.loginForm);
		await fixture.whenStable();

		expect(host.loginForm.email().touched()).toBe(true);
		expect(host.loginForm.email().dirty()).toBe(true);
		expect(host.loginForm.password().touched()).toBe(true);
		expect(host.loginForm.password().dirty()).toBe(true);
		expect(errorText()).toBe("Email is required");
	});

	/**
	 * An empty box is missing, not malformed. "Invalid email format" under a
	 * field nobody typed in was the second half of the #303 complaint.
	 */
	it("calls an empty field missing, and a half-typed one malformed", async () => {
		revealErrors(host.loginForm);
		await fixture.whenStable();
		expect(errorText()).toBe("Email is required");

		await type("not-an-email");

		expect(errorText()).toBe("Invalid email format");
	});

	/** `reset()` clears touched and dirty together, so the kit goes quiet. */
	it("goes quiet again after the form is reset", async () => {
		await type("not-an-email");
		await blur();
		expect(errorText()).toBe("Invalid email format");

		host.loginForm().reset({ email: "", password: "" });
		await fixture.whenStable();

		expect(errorText()).toBeNull();
	});
});

import { Component, signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import {
	form,
	FormField,
	validateStandardSchema,
} from "@angular/forms/signals";

import { loginSchema, type LoginFormData } from "../../validators/auth.schemas";
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

	it("shows the schema's own message once the field is touched", async () => {
		await type("not-an-email");
		host.loginForm.email().markAsTouched();
		await fixture.whenStable();

		expect(errorText()).toBe("Invalid email format");
		expect(input().className).toContain("border-destructive");
		expect(input().getAttribute("aria-invalid")).toBe("true");
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

	it("markAsTouched on the root reveals every field at once", async () => {
		host.loginForm().markAsTouched();
		await fixture.whenStable();

		expect(host.loginForm.email().touched()).toBe(true);
		expect(host.loginForm.password().touched()).toBe(true);
		// #303: the box is empty, so it reads as missing rather than as a
		// malformed address.
		expect(errorText()).toBe("Email is required");
	});
});

import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideIcons } from "@ng-icons/core";

import { TREMOLO_ICONS } from "../../icons";
import { NotificationService } from "../../services/notification.service";
import { ToastContainerComponent } from "./toast-container.component";

/**
 * Real timers on purpose. `vi.useFakeTimers()` freezes the scheduler a
 * zoneless application uses to run change detection, so `whenStable()`
 * never resolves and every test in the file times out. The durations here
 * are therefore short and real; only the 300ms exit animation, which is a
 * fixed constant in the component, costs anything.
 */
describe("ToastContainerComponent", () => {
	let fixture: ComponentFixture<ToastContainerComponent>;
	let notifications: NotificationService;

	beforeEach(async () => {
		TestBed.configureTestingModule({
			providers: [provideIcons(TREMOLO_ICONS)],
		});
		notifications = TestBed.inject(NotificationService);
		fixture = TestBed.createComponent(ToastContainerComponent);
		await fixture.whenStable();
	});

	function alerts(): HTMLElement[] {
		return [...fixture.nativeElement.querySelectorAll("[role='alert']")];
	}

	async function settle(): Promise<void> {
		await fixture.whenStable();
	}

	async function wait(ms: number): Promise<void> {
		await new Promise((resolve) => setTimeout(resolve, ms));
		await settle();
	}

	it("renders nothing until something is shown", () => {
		expect(fixture.nativeElement.textContent.trim()).toBe("");
	});

	it("shows a toast with its title and message", async () => {
		notifications.showSuccess("Game results saved successfully!", "Saved");
		await settle();

		expect(alerts().length).toBe(1);
		expect(alerts()[0]!.textContent).toContain("Saved");
		expect(alerts()[0]!.textContent).toContain(
			"Game results saved successfully!",
		);
	});

	it("announces politely, which is how a toast reaches a screen reader", async () => {
		notifications.showInfo("Heads up");
		await settle();

		const region = fixture.nativeElement.querySelector("[aria-live]");
		expect(region.getAttribute("aria-live")).toBe("polite");
		expect(region.getAttribute("aria-atomic")).toBe("true");
	});

	it("dismisses itself once its duration elapses", async () => {
		notifications.showToast("Bye", "info", undefined, 80);
		await settle();
		expect(alerts().length).toBe(1);

		await wait(20);
		expect(alerts().length).toBe(1);

		await wait(120);
		expect(alerts().length).toBe(0);
		expect(notifications.toasts().length).toBe(0);
	});

	it("dismisses when the close button is pressed, after the exit animation", async () => {
		notifications.showError("Failed to save game results.");
		await settle();

		const close = fixture.nativeElement.querySelector(
			"button[aria-label='Dismiss notification']",
		) as HTMLButtonElement;
		close.click();
		await settle();

		// Still on screen while it slides out...
		expect(alerts().length).toBe(1);

		await wait(400);
		expect(alerts().length).toBe(0);
	});

	it("stacks several toasts and removes only the one that expires", async () => {
		notifications.showToast("first", "info", undefined, 80);
		notifications.showToast("second", "info", undefined, 10_000);
		await settle();
		expect(alerts().length).toBe(2);

		await wait(150);

		expect(alerts().length).toBe(1);
		expect(alerts()[0]!.textContent).toContain("second");
	});

	it("keeps a toast with a non-positive duration on screen", async () => {
		notifications.showToast("sticky", "warning", undefined, 0);
		await settle();

		await wait(150);

		expect(alerts().length).toBe(1);
	});
});

import { signal } from "@angular/core";

import { showHideLabel } from "./password-toggle.utils";

describe("showHideLabel", () => {
	it("flips between Show and Hide around the subject", () => {
		const shown = signal(false);
		const label = showHideLabel(shown, "confirm password");

		expect(label()).toBe("Show confirm password");

		shown.set(true);
		expect(label()).toBe("Hide confirm password");
	});
});

import { provideRouter } from "@angular/router";
import { render } from "@testing-library/angular";

import { AppComponent } from "./app.component";

describe("AppComponent", () => {
	it("hosts the router outlet", async () => {
		const { container } = await render(AppComponent, {
			providers: [provideRouter([])],
		});

		expect(container.querySelector("router-outlet")).toBeTruthy();
	});
});

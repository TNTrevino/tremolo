import { render, screen } from '@testing-library/angular';

import { AppComponent } from './app.component';

describe('AppComponent', () => {
	it('renders the shell', async () => {
		await render(AppComponent);

		expect(
			screen.getByRole('heading', { name: 'Tremolo', level: 1 }),
		).toBeTruthy();
	});
});

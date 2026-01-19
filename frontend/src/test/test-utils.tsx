import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";

interface WrapperProps {
	children: ReactNode;
}

/**
 * Custom render function that wraps components with necessary providers
 */
function AllProviders({ children }: WrapperProps) {
	return (
		<BrowserRouter>
			<ThemeProvider>{children}</ThemeProvider>
		</BrowserRouter>
	);
}

function customRender(
	ui: ReactElement,
	options?: Omit<RenderOptions, "wrapper">,
) {
	return render(ui, { wrapper: AllProviders, ...options });
}

// Re-export everything from testing-library
export * from "@testing-library/react";

// Override render with our custom render
export { customRender as render };

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
	describe("rendering", () => {
		it("renders button with children", () => {
			render(<Button>Click me</Button>);

			expect(
				screen.getByRole("button", { name: "Click me" }),
			).toBeInTheDocument();
		});

		it("renders with default variant and size", () => {
			render(<Button>Default Button</Button>);

			const button = screen.getByRole("button");
			expect(button).toHaveClass("bg-primary");
			expect(button).toHaveClass("h-10");
		});
	});

	describe("variants", () => {
		it("renders default variant", () => {
			render(<Button variant="default">Default</Button>);

			const button = screen.getByRole("button");
			expect(button).toHaveClass("bg-primary");
			expect(button).toHaveClass("text-primary-foreground");
		});

		it("renders destructive variant", () => {
			render(<Button variant="destructive">Delete</Button>);

			const button = screen.getByRole("button");
			expect(button).toHaveClass("bg-destructive");
			expect(button).toHaveClass("text-destructive-foreground");
		});

		it("renders outline variant", () => {
			render(<Button variant="outline">Outline</Button>);

			const button = screen.getByRole("button");
			expect(button).toHaveClass("border-2");
			expect(button).toHaveClass("bg-background");
		});

		it("renders secondary variant", () => {
			render(<Button variant="secondary">Secondary</Button>);

			const button = screen.getByRole("button");
			expect(button).toHaveClass("bg-secondary");
		});

		it("renders ghost variant", () => {
			render(<Button variant="ghost">Ghost</Button>);

			const button = screen.getByRole("button");
			expect(button).toHaveClass("hover:bg-accent");
		});

		it("renders link variant", () => {
			render(<Button variant="link">Link</Button>);

			const button = screen.getByRole("button");
			expect(button).toHaveClass("text-primary");
			expect(button).toHaveClass("underline-offset-4");
		});
	});

	describe("sizes", () => {
		it("renders default size", () => {
			render(<Button size="default">Default</Button>);

			const button = screen.getByRole("button");
			expect(button).toHaveClass("h-10");
			expect(button).toHaveClass("px-4");
		});

		it("renders small size", () => {
			render(<Button size="sm">Small</Button>);

			const button = screen.getByRole("button");
			expect(button).toHaveClass("h-9");
			expect(button).toHaveClass("px-3");
		});

		it("renders large size", () => {
			render(<Button size="lg">Large</Button>);

			const button = screen.getByRole("button");
			expect(button).toHaveClass("h-11");
			expect(button).toHaveClass("px-8");
		});

		it("renders extra large size", () => {
			render(<Button size="xl">Extra Large</Button>);

			const button = screen.getByRole("button");
			expect(button).toHaveClass("h-14");
			expect(button).toHaveClass("px-10");
		});

		it("renders icon size", () => {
			render(<Button size="icon">X</Button>);

			const button = screen.getByRole("button");
			expect(button).toHaveClass("h-10");
			expect(button).toHaveClass("w-10");
		});
	});

	describe("loading state", () => {
		it("shows loading spinner when loading", () => {
			render(<Button loading>Submit</Button>);

			const button = screen.getByRole("button");
			expect(button).toHaveTextContent("Loading...");
			expect(button.querySelector("svg")).toBeInTheDocument();
		});

		it("is disabled when loading", () => {
			render(<Button loading>Submit</Button>);

			const button = screen.getByRole("button");
			expect(button).toBeDisabled();
		});

		it("does not show loading spinner when not loading", () => {
			render(<Button>Submit</Button>);

			const button = screen.getByRole("button");
			expect(button).not.toHaveTextContent("Loading...");
		});
	});

	describe("disabled state", () => {
		it("is disabled when disabled prop is true", () => {
			render(<Button disabled>Disabled</Button>);

			const button = screen.getByRole("button");
			expect(button).toBeDisabled();
		});

		it("has disabled styles", () => {
			render(<Button disabled>Disabled</Button>);

			const button = screen.getByRole("button");
			expect(button).toHaveClass("disabled:pointer-events-none");
			expect(button).toHaveClass("disabled:opacity-50");
		});
	});

	describe("interactions", () => {
		it("calls onClick when clicked", async () => {
			const handleClick = vi.fn();
			const user = userEvent.setup();

			render(<Button onClick={handleClick}>Click me</Button>);

			await user.click(screen.getByRole("button"));

			expect(handleClick).toHaveBeenCalledTimes(1);
		});

		it("does not call onClick when disabled", async () => {
			const handleClick = vi.fn();
			const user = userEvent.setup();

			render(
				<Button onClick={handleClick} disabled>
					Click me
				</Button>,
			);

			await user.click(screen.getByRole("button"));

			expect(handleClick).not.toHaveBeenCalled();
		});

		it("does not call onClick when loading", async () => {
			const handleClick = vi.fn();
			const user = userEvent.setup();

			render(
				<Button onClick={handleClick} loading>
					Click me
				</Button>,
			);

			await user.click(screen.getByRole("button"));

			expect(handleClick).not.toHaveBeenCalled();
		});
	});

	describe("accessibility", () => {
		it("supports custom className", () => {
			render(<Button className="custom-class">Button</Button>);

			const button = screen.getByRole("button");
			expect(button).toHaveClass("custom-class");
		});

		it("forwards ref to button element", () => {
			const ref = vi.fn();
			render(<Button ref={ref}>Button</Button>);

			expect(ref).toHaveBeenCalled();
		});

		it("passes through additional props", () => {
			render(
				<Button type="submit" data-testid="custom-button">
					Submit
				</Button>,
			);

			const button = screen.getByTestId("custom-button");
			expect(button).toHaveAttribute("type", "submit");
		});
	});
});

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KeyboardBindingsEditor } from "./KeyboardBindingsEditor";
import { KeyboardBindingsDialog } from "./KeyboardBindingsDialog";
import { DEFAULT_NOTE_TO_KEY_MAP } from "../hooks/useKeyboardInput";

const defaultBindings: Record<string, string> = {
	"C#": "q",
	"D#": "w",
	"E#": "e",
	"F#": "r",
	"G#": "t",
	"A#": "y",
	"B#": "u",
	C: "a",
	D: "s",
	E: "d",
	F: "f",
	G: "g",
	A: "h",
	B: "j",
	Cb: "z",
	Db: "x",
	Eb: "c",
	Fb: "v",
	Gb: "b",
	Ab: "n",
	Bb: "m",
};

describe("KeyboardBindingsEditor", () => {
	describe("rendering", () => {
		it("renders all 21 key buttons", () => {
			render(
				<KeyboardBindingsEditor
					bindings={defaultBindings}
					onChange={vi.fn()}
				/>,
			);

			const buttons = screen.getAllByRole("button");
			// 21 note buttons + 1 Reset to Defaults button
			expect(buttons).toHaveLength(22);
		});

		it("renders sharps row labels", () => {
			render(
				<KeyboardBindingsEditor
					bindings={defaultBindings}
					onChange={vi.fn()}
				/>,
			);

			expect(screen.getByText("Sharps")).toBeInTheDocument();
			expect(screen.getByText("Naturals")).toBeInTheDocument();
			expect(screen.getByText("Flats")).toBeInTheDocument();
		});

		it("renders each note name in a button", () => {
			render(
				<KeyboardBindingsEditor
					bindings={defaultBindings}
					onChange={vi.fn()}
				/>,
			);

			const allNotes = [
				"C#",
				"D#",
				"E#",
				"F#",
				"G#",
				"A#",
				"B#",
				"C",
				"D",
				"E",
				"F",
				"G",
				"A",
				"B",
				"Cb",
				"Db",
				"Eb",
				"Fb",
				"Gb",
				"Ab",
				"Bb",
			];
			for (const note of allNotes) {
				expect(screen.getByText(note)).toBeInTheDocument();
			}
		});

		it("shows assigned key for each note button", () => {
			render(
				<KeyboardBindingsEditor
					bindings={defaultBindings}
					onChange={vi.fn()}
				/>,
			);

			// Check a few representative keys are displayed
			expect(screen.getByText("a")).toBeInTheDocument(); // C
			expect(screen.getByText("q")).toBeInTheDocument(); // C#
			expect(screen.getByText("z")).toBeInTheDocument(); // Cb
		});
	});

	describe("listening mode", () => {
		it("enters listening mode when a button is clicked", async () => {
			const user = userEvent.setup();

			render(
				<KeyboardBindingsEditor
					bindings={defaultBindings}
					onChange={vi.fn()}
				/>,
			);

			// Click the C note button
			await user.click(screen.getByText("C").closest("button")!);

			// In listening mode, the "..." indicator appears
			expect(screen.getByText("...")).toBeInTheDocument();
		});

		it("calls onListeningChange when entering listening mode", async () => {
			const user = userEvent.setup();
			const onListeningChange = vi.fn();

			render(
				<KeyboardBindingsEditor
					bindings={defaultBindings}
					onChange={vi.fn()}
					onListeningChange={onListeningChange}
				/>,
			);

			await user.click(screen.getByText("C").closest("button")!);

			expect(onListeningChange).toHaveBeenCalledWith("C");
		});

		it("cancels listening mode when Escape is pressed", async () => {
			const user = userEvent.setup();
			const onListeningChange = vi.fn();

			render(
				<KeyboardBindingsEditor
					bindings={defaultBindings}
					onChange={vi.fn()}
					onListeningChange={onListeningChange}
				/>,
			);

			await user.click(screen.getByText("C").closest("button")!);
			expect(screen.getByText("...")).toBeInTheDocument();

			fireEvent.keyDown(document, { key: "Escape" });

			expect(screen.queryByText("...")).not.toBeInTheDocument();
			expect(onListeningChange).toHaveBeenLastCalledWith(null);
		});

		it("assigns a new key when pressed during listening mode", async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();

			render(
				<KeyboardBindingsEditor
					bindings={defaultBindings}
					onChange={onChange}
				/>,
			);

			// Click C to enter listening mode
			await user.click(screen.getByText("C").closest("button")!);

			// Press 'p' to assign it
			fireEvent.keyDown(document, { key: "p" });

			expect(onChange).toHaveBeenCalledWith(
				expect.objectContaining({ C: "p" }),
			);
		});

		it("auto-swaps keys when a conflicting key is assigned", async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();

			render(
				<KeyboardBindingsEditor
					bindings={defaultBindings}
					onChange={onChange}
				/>,
			);

			// Click C (currently 'a') to enter listening mode
			await user.click(screen.getByText("C").closest("button")!);

			// Press 's' which is currently assigned to D
			fireEvent.keyDown(document, { key: "s" });

			// C should get 's', D should get 'a' (swapped)
			expect(onChange).toHaveBeenCalledWith(
				expect.objectContaining({ C: "s", D: "a" }),
			);
		});

		it("exits listening mode after key assignment", async () => {
			const user = userEvent.setup();
			const onListeningChange = vi.fn();

			render(
				<KeyboardBindingsEditor
					bindings={defaultBindings}
					onChange={vi.fn()}
					onListeningChange={onListeningChange}
				/>,
			);

			await user.click(screen.getByText("C").closest("button")!);
			fireEvent.keyDown(document, { key: "p" });

			// Should have called onListeningChange(null) to exit
			expect(onListeningChange).toHaveBeenLastCalledWith(null);
		});
	});

	describe("reset to defaults", () => {
		it("calls onChange with default bindings when Reset button is clicked", async () => {
			const user = userEvent.setup();
			const onChange = vi.fn();

			const customBindings = { ...defaultBindings, C: "p" };

			render(
				<KeyboardBindingsEditor
					bindings={customBindings}
					onChange={onChange}
				/>,
			);

			await user.click(
				screen.getByRole("button", { name: /reset to defaults/i }),
			);

			expect(onChange).toHaveBeenCalledWith(DEFAULT_NOTE_TO_KEY_MAP);
		});
	});
});

describe("KeyboardBindingsDialog", () => {
	describe("visibility", () => {
		it("renders dialog content when open is true", () => {
			render(
				<KeyboardBindingsDialog
					open={true}
					onOpenChange={vi.fn()}
					bindings={defaultBindings}
					onSave={vi.fn()}
				/>,
			);

			expect(screen.getByText("Keyboard Bindings")).toBeInTheDocument();
			expect(screen.getByRole("dialog")).toBeInTheDocument();
		});

		it("does not render dialog content when open is false", () => {
			render(
				<KeyboardBindingsDialog
					open={false}
					onOpenChange={vi.fn()}
					bindings={defaultBindings}
					onSave={vi.fn()}
				/>,
			);

			expect(screen.queryByText("Keyboard Bindings")).not.toBeInTheDocument();
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
	});

	describe("cancel", () => {
		it("calls onOpenChange(false) when Cancel is clicked", async () => {
			const user = userEvent.setup();
			const onOpenChange = vi.fn();

			render(
				<KeyboardBindingsDialog
					open={true}
					onOpenChange={onOpenChange}
					bindings={defaultBindings}
					onSave={vi.fn()}
				/>,
			);

			const dialog = screen.getByRole("dialog");
			await user.click(within(dialog).getByRole("button", { name: /cancel/i }));

			expect(onOpenChange).toHaveBeenCalledWith(false);
		});
	});

	describe("save", () => {
		it("calls onSave with current bindings when Save is clicked", async () => {
			const user = userEvent.setup();
			const onSave = vi.fn();
			const onOpenChange = vi.fn();

			render(
				<KeyboardBindingsDialog
					open={true}
					onOpenChange={onOpenChange}
					bindings={defaultBindings}
					onSave={onSave}
				/>,
			);

			const dialog = screen.getByRole("dialog");
			await user.click(within(dialog).getByRole("button", { name: /save/i }));

			expect(onSave).toHaveBeenCalledWith(defaultBindings);
			expect(onOpenChange).toHaveBeenCalledWith(false);
		});

		it("saves draft changes after modifying a binding", async () => {
			const user = userEvent.setup();
			const onSave = vi.fn();

			render(
				<KeyboardBindingsDialog
					open={true}
					onOpenChange={vi.fn()}
					bindings={defaultBindings}
					onSave={onSave}
				/>,
			);

			const dialog = screen.getByRole("dialog");

			// Click the C note button to enter listening mode
			await user.click(within(dialog).getByText("C").closest("button")!);

			// Press 'p' to assign it
			fireEvent.keyDown(document, { key: "p" });

			// Save
			await user.click(within(dialog).getByRole("button", { name: /save/i }));

			expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ C: "p" }));
		});
	});
});

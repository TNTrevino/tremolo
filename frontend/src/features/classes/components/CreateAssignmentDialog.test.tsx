import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/test-utils";
import userEvent from "@testing-library/user-event";
import { CreateAssignmentDialog } from "./CreateAssignmentDialog";
import { scaleGame } from "@/features/identification-game";

const mockMutate = vi.fn();

vi.mock("@/shared/hooks/queries", () => ({
	useCreateAssignment: () => ({ mutate: mockMutate, isPending: false }),
}));

describe("CreateAssignmentDialog", () => {
	beforeEach(() => {
		mockMutate.mockReset();
	});

	it("builds a CreateAssignmentRequest with camelCase config and snake_case fields", async () => {
		const user = userEvent.setup();
		render(
			<CreateAssignmentDialog
				classId={7}
				open={true}
				onOpenChange={() => {}}
			/>,
		);

		await user.type(screen.getByLabelText(/Title/), "Scale drills");
		await user.selectOptions(screen.getByLabelText("Game"), "scale");
		await user.click(screen.getByRole("button", { name: "Create assignment" }));

		expect(mockMutate).toHaveBeenCalledTimes(1);
		const [variables] = mockMutate.mock.calls[0] ?? [];
		expect(variables.classId).toBe(7);

		const { request } = variables;
		// Top-level fields are snake_case.
		expect(request.title).toBe("Scale drills");
		expect(request.game_type).toBe("scale");
		expect(request.due_at).toBeNull();
		expect(request.target_questions).toBeNull();
		expect(request.target_accuracy).toBeNull();

		// The config blob is the scale game's defaults verbatim (camelCase).
		expect(request.config).toEqual(scaleGame.defaults);
	});

	it("requires a title before submitting", async () => {
		const user = userEvent.setup();
		render(
			<CreateAssignmentDialog
				classId={7}
				open={true}
				onOpenChange={() => {}}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "Create assignment" }));

		expect(mockMutate).not.toHaveBeenCalled();
		expect(screen.getByText("Title is required")).toBeInTheDocument();
	});
});

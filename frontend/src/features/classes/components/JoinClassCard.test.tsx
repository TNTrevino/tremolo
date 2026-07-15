import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test/test-utils";
import userEvent from "@testing-library/user-event";
import { AxiosError, AxiosHeaders } from "axios";
import { JoinClassCard } from "./JoinClassCard";

const mockMutate = vi.fn();
const mockJoinClass = {
	mutate: mockMutate,
	isPending: false,
	isError: false,
	error: null as unknown,
};
const mockStudentClasses = {
	data: [] as { id: number; name: string; teacherName: string }[],
	isLoading: false,
	isError: false,
};

vi.mock("@/shared/hooks/queries", () => ({
	useJoinClass: () => mockJoinClass,
	useStudentClasses: () => mockStudentClasses,
}));

function make404Error(message: string) {
	return new AxiosError(
		"Request failed with status code 404",
		"404",
		undefined,
		undefined,
		{
			status: 404,
			statusText: "Not Found",
			headers: new AxiosHeaders(),
			config: { headers: new AxiosHeaders() },
			data: { error: message },
		},
	);
}

describe("JoinClassCard", () => {
	beforeEach(() => {
		mockMutate.mockReset();
		mockJoinClass.isPending = false;
		mockJoinClass.isError = false;
		mockJoinClass.error = null;
		mockStudentClasses.data = [];
		mockStudentClasses.isLoading = false;
		mockStudentClasses.isError = false;
	});

	it("submits the entered join code", async () => {
		const user = userEvent.setup();
		render(<JoinClassCard />);

		await user.type(screen.getByLabelText(/class code/i), "7NZJN3");
		await user.click(screen.getByRole("button", { name: /join/i }));

		await waitFor(() => {
			expect(mockMutate).toHaveBeenCalledWith(
				"7NZJN3",
				expect.objectContaining({ onSuccess: expect.any(Function) }),
			);
		});
	});

	it("shows the backend's 404 message inline, not as a toast", () => {
		mockJoinClass.isError = true;
		mockJoinClass.error = make404Error("No class with that join code");

		render(<JoinClassCard />);

		expect(
			screen.getByText("No class with that join code"),
		).toBeInTheDocument();
	});

	it("falls back to a generic message when the error body has no error field", () => {
		mockJoinClass.isError = true;
		mockJoinClass.error = new Error("network down");

		render(<JoinClassCard />);

		expect(screen.getByText("network down")).toBeInTheDocument();
	});

	it("lists the student's joined classes without join codes", () => {
		mockStudentClasses.data = [
			{ id: 1, name: "Symphonic Band", teacherName: "Terry Director" },
		];

		render(<JoinClassCard />);

		expect(screen.getByText("Symphonic Band")).toBeInTheDocument();
		expect(screen.getByText("Terry Director")).toBeInTheDocument();
		expect(screen.queryByText(/join code/i)).not.toBeInTheDocument();
	});

	it("shows an empty state when the student has no classes", () => {
		render(<JoinClassCard />);

		expect(
			screen.getByText(/haven't joined any classes yet/i),
		).toBeInTheDocument();
	});
});

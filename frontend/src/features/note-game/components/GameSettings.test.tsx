import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { GameSettings as GameSettingsType } from "../types";
import GameSettings from "./GameSettings";

const defaultSettings: GameSettingsType = {
	gameMode: "time",
	timeLimit: 30,
	noteLimit: 25,
	scale: "C Major",
	octave: 4,
};

describe("GameSettings", () => {
	describe("rendering", () => {
		it("renders the game settings form", () => {
			render(
				<GameSettings
					settings={defaultSettings}
					onSettingsChange={vi.fn()}
					onStartGame={vi.fn()}
				/>,
			);

			expect(screen.getByText("Note Recognition Game")).toBeInTheDocument();
			expect(
				screen.getByText("Configure your game settings and start practicing"),
			).toBeInTheDocument();
		});

		it("renders game mode buttons", () => {
			render(
				<GameSettings
					settings={defaultSettings}
					onSettingsChange={vi.fn()}
					onStartGame={vi.fn()}
				/>,
			);

			expect(
				screen.getByRole("button", { name: "Time Mode" }),
			).toBeInTheDocument();
			expect(
				screen.getByRole("button", { name: "Notes Mode" }),
			).toBeInTheDocument();
		});

		it("renders Start Game button", () => {
			render(
				<GameSettings
					settings={defaultSettings}
					onSettingsChange={vi.fn()}
					onStartGame={vi.fn()}
				/>,
			);

			expect(
				screen.getByRole("button", { name: /start game/i }),
			).toBeInTheDocument();
		});

		it("renders scale selector", () => {
			render(
				<GameSettings
					settings={defaultSettings}
					onSettingsChange={vi.fn()}
					onStartGame={vi.fn()}
				/>,
			);

			expect(screen.getByLabelText("Scale")).toBeInTheDocument();
		});

		it("renders octave selector", () => {
			render(
				<GameSettings
					settings={defaultSettings}
					onSettingsChange={vi.fn()}
					onStartGame={vi.fn()}
				/>,
			);

			expect(screen.getByLabelText("Octave")).toBeInTheDocument();
		});
	});

	describe("game mode selection", () => {
		it("shows time limit selector in time mode", () => {
			render(
				<GameSettings
					settings={{ ...defaultSettings, gameMode: "time" }}
					onSettingsChange={vi.fn()}
					onStartGame={vi.fn()}
				/>,
			);

			expect(screen.getByLabelText("Time Limit")).toBeInTheDocument();
		});

		it("shows note limit selector in notes mode", () => {
			render(
				<GameSettings
					settings={{ ...defaultSettings, gameMode: "notes" }}
					onSettingsChange={vi.fn()}
					onStartGame={vi.fn()}
				/>,
			);

			expect(screen.getByLabelText("Note Limit")).toBeInTheDocument();
		});

		it("calls onSettingsChange when Time Mode is clicked", async () => {
			const handleChange = vi.fn();
			const user = userEvent.setup();

			render(
				<GameSettings
					settings={{ ...defaultSettings, gameMode: "notes" }}
					onSettingsChange={handleChange}
					onStartGame={vi.fn()}
				/>,
			);

			await user.click(screen.getByRole("button", { name: "Time Mode" }));

			expect(handleChange).toHaveBeenCalledWith({ gameMode: "time" });
		});

		it("calls onSettingsChange when Notes Mode is clicked", async () => {
			const handleChange = vi.fn();
			const user = userEvent.setup();

			render(
				<GameSettings
					settings={{ ...defaultSettings, gameMode: "time" }}
					onSettingsChange={handleChange}
					onStartGame={vi.fn()}
				/>,
			);

			await user.click(screen.getByRole("button", { name: "Notes Mode" }));

			expect(handleChange).toHaveBeenCalledWith({ gameMode: "notes" });
		});
	});

	describe("time limit selection", () => {
		it("displays current time limit value", () => {
			render(
				<GameSettings
					settings={{ ...defaultSettings, timeLimit: 60 }}
					onSettingsChange={vi.fn()}
					onStartGame={vi.fn()}
				/>,
			);

			const select = screen.getByLabelText("Time Limit");
			expect(select).toHaveValue("60");
		});

		it("calls onSettingsChange when time limit changes", async () => {
			const handleChange = vi.fn();
			const user = userEvent.setup();

			render(
				<GameSettings
					settings={defaultSettings}
					onSettingsChange={handleChange}
					onStartGame={vi.fn()}
				/>,
			);

			await user.selectOptions(screen.getByLabelText("Time Limit"), "60");

			expect(handleChange).toHaveBeenCalledWith({ timeLimit: 60 });
		});
	});

	describe("note limit selection", () => {
		it("displays current note limit value", () => {
			render(
				<GameSettings
					settings={{ ...defaultSettings, gameMode: "notes", noteLimit: 50 }}
					onSettingsChange={vi.fn()}
					onStartGame={vi.fn()}
				/>,
			);

			const select = screen.getByLabelText("Note Limit");
			expect(select).toHaveValue("50");
		});

		it("calls onSettingsChange when note limit changes", async () => {
			const handleChange = vi.fn();
			const user = userEvent.setup();

			render(
				<GameSettings
					settings={{ ...defaultSettings, gameMode: "notes" }}
					onSettingsChange={handleChange}
					onStartGame={vi.fn()}
				/>,
			);

			await user.selectOptions(screen.getByLabelText("Note Limit"), "100");

			expect(handleChange).toHaveBeenCalledWith({ noteLimit: 100 });
		});
	});

	describe("scale selection", () => {
		it("displays current scale value", () => {
			render(
				<GameSettings
					settings={{ ...defaultSettings, scale: "G Major" }}
					onSettingsChange={vi.fn()}
					onStartGame={vi.fn()}
				/>,
			);

			const select = screen.getByLabelText("Scale");
			expect(select).toHaveValue("G Major");
		});

		it("calls onSettingsChange when scale changes", async () => {
			const handleChange = vi.fn();
			const user = userEvent.setup();

			render(
				<GameSettings
					settings={defaultSettings}
					onSettingsChange={handleChange}
					onStartGame={vi.fn()}
				/>,
			);

			await user.selectOptions(screen.getByLabelText("Scale"), "D Major");

			expect(handleChange).toHaveBeenCalledWith({ scale: "D Major" });
		});
	});

	describe("octave selection", () => {
		it("displays current octave value", () => {
			render(
				<GameSettings
					settings={{ ...defaultSettings, octave: 5 }}
					onSettingsChange={vi.fn()}
					onStartGame={vi.fn()}
				/>,
			);

			const select = screen.getByLabelText("Octave");
			expect(select).toHaveValue("5");
		});

		it("calls onSettingsChange when octave changes", async () => {
			const handleChange = vi.fn();
			const user = userEvent.setup();

			render(
				<GameSettings
					settings={defaultSettings}
					onSettingsChange={handleChange}
					onStartGame={vi.fn()}
				/>,
			);

			await user.selectOptions(screen.getByLabelText("Octave"), "6");

			expect(handleChange).toHaveBeenCalledWith({ octave: 6 });
		});
	});

	describe("start game", () => {
		it("calls onStartGame when Start Game button is clicked", async () => {
			const handleStartGame = vi.fn();
			const user = userEvent.setup();

			render(
				<GameSettings
					settings={defaultSettings}
					onSettingsChange={vi.fn()}
					onStartGame={handleStartGame}
				/>,
			);

			await user.click(screen.getByRole("button", { name: /start game/i }));

			expect(handleStartGame).toHaveBeenCalledTimes(1);
		});
	});
});

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { GameSettings as GameSettingsType } from "../types";
import { GameMode } from "../types";
import { GameSettings } from "./GameSettings";

const defaultSettings: GameSettingsType = {
	gameMode: GameMode.Time,
	timeLimit: 30,
	noteLimit: 25,
	scale: "C Major",
	octave: 4,
	lowNote: "C4",
	highNote: "C6",
	clef: "treble",
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

		it("renders note range picker", () => {
			render(
				<GameSettings
					settings={defaultSettings}
					onSettingsChange={vi.fn()}
					onStartGame={vi.fn()}
				/>,
			);

			expect(screen.getByText("Note Range")).toBeInTheDocument();
			expect(
				screen.getByRole("img", { name: /note range from C4 to C6/i }),
			).toBeInTheDocument();
		});
	});

	describe("game mode selection", () => {
		it("shows time limit selector in time mode", () => {
			render(
				<GameSettings
					settings={{ ...defaultSettings, gameMode: GameMode.Time }}
					onSettingsChange={vi.fn()}
					onStartGame={vi.fn()}
				/>,
			);

			expect(screen.getByLabelText("Time Limit")).toBeInTheDocument();
		});

		it("shows note limit selector in notes mode", () => {
			render(
				<GameSettings
					settings={{ ...defaultSettings, gameMode: GameMode.Notes }}
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
					settings={{ ...defaultSettings, gameMode: GameMode.Notes }}
					onSettingsChange={handleChange}
					onStartGame={vi.fn()}
				/>,
			);

			await user.click(screen.getByRole("button", { name: "Time Mode" }));

			expect(handleChange).toHaveBeenCalledWith({ gameMode: GameMode.Time });
		});

		it("calls onSettingsChange when Notes Mode is clicked", async () => {
			const handleChange = vi.fn();
			const user = userEvent.setup();

			render(
				<GameSettings
					settings={{ ...defaultSettings, gameMode: GameMode.Time }}
					onSettingsChange={handleChange}
					onStartGame={vi.fn()}
				/>,
			);

			await user.click(screen.getByRole("button", { name: "Notes Mode" }));

			expect(handleChange).toHaveBeenCalledWith({ gameMode: GameMode.Notes });
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
					settings={{
						...defaultSettings,
						gameMode: GameMode.Notes,
						noteLimit: 50,
					}}
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
					settings={{ ...defaultSettings, gameMode: GameMode.Notes }}
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

	describe("note range selection", () => {
		it("displays the current range", () => {
			render(
				<GameSettings
					settings={{ ...defaultSettings, lowNote: "E4", highNote: "F5" }}
					onSettingsChange={vi.fn()}
					onStartGame={vi.fn()}
				/>,
			);

			expect(screen.getByText("E4 – F5")).toBeInTheDocument();
		});

		it("steps the low endpoint up via the chevron", async () => {
			const handleChange = vi.fn();
			const user = userEvent.setup();

			render(
				<GameSettings
					settings={defaultSettings}
					onSettingsChange={handleChange}
					onStartGame={vi.fn()}
				/>,
			);

			await user.click(screen.getByRole("button", { name: "Lowest note up" }));

			expect(handleChange).toHaveBeenCalledWith({
				lowNote: "D4",
				highNote: "C6",
			});
		});

		it("switching clef resets the range to the clef default", async () => {
			const handleChange = vi.fn();
			const user = userEvent.setup();

			render(
				<GameSettings
					settings={defaultSettings}
					onSettingsChange={handleChange}
					onStartGame={vi.fn()}
				/>,
			);

			await user.click(screen.getByRole("button", { name: "Bass" }));

			expect(handleChange).toHaveBeenCalledWith({
				clef: "bass",
				lowNote: "E2",
				highNote: "E4",
			});
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

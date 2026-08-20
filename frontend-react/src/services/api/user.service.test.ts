import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AxiosInstance } from "axios";
import { UserService } from "./user.service";

function createMockClient() {
	return {
		get: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		patch: vi.fn(),
		delete: vi.fn(),
	} as unknown as AxiosInstance & {
		post: ReturnType<typeof vi.fn>;
	};
}

describe("UserService.saveGameResult", () => {
	let client: ReturnType<typeof createMockClient>;
	let service: UserService;

	beforeEach(() => {
		client = createMockClient();
		service = new UserService(client);
		client.post.mockResolvedValue({ data: { message: "ok", id: 1 } });
	});

	it("tags the entry with assignment_id when playing an assignment", async () => {
		await service.saveGameResult({
			timeLength: "00:00:30",
			totalQuestions: 20,
			correctQuestions: 15,
			userId: 42,
			notesPerMinute: 30,
			gameType: "scale",
			assignmentId: 7,
		});

		expect(client.post).toHaveBeenCalledWith(
			"/api/note-game/entry",
			expect.objectContaining({ assignment_id: 7, game_type: "scale" }),
		);
	});

	it("leaves assignment_id undefined for normal (untagged) play", async () => {
		await service.saveGameResult({
			timeLength: "00:00:30",
			totalQuestions: 20,
			correctQuestions: 15,
			userId: 42,
			notesPerMinute: 30,
		});

		const body = client.post.mock.calls[0]![1];
		expect(body.assignment_id).toBeUndefined();
		expect(body.game_type).toBe("note");
	});
});

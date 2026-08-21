/**
 * Port of frontend-react/src/services/api/types/game.types.ts -- the
 * `GameType` union only, which is the half of that file the classes feature
 * needs. The score-entry and settings shapes in the same React file belong
 * to the game phases and land with them.
 *
 * This union is one of three places a new game has to be registered; the
 * other two are `backend/main/DTOs/game_types.go` (`ValidGameTypes`) and the
 * game's own definition. See the root CLAUDE.md.
 */
export type GameType =
	"note" | "key_signature" | "scale" | "chord" | "interval";

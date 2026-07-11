import { useRef } from "react";
import { useGameTimer } from "./useGameTimer";

/**
 * Countdown timer wired to the game engine. The two are circular —
 * the timer must end the game, and starting the game must start the
 * timer — so the end-game side goes through a ref the page assigns
 * once useIdentificationGame has returned `endGame`:
 *
 *   const { endGameRef, startTimer, ... } = useGameLifecycle();
 *   const { endGame, ... } = useIdentificationGame({ onGameStart: ... });
 *   useEffect(() => { endGameRef.current = endGame; }, [endGame, endGameRef]);
 */
export function useGameLifecycle() {
	const endGameRef = useRef<() => void>();
	const timer = useGameTimer(() => endGameRef.current?.());
	return { ...timer, endGameRef };
}

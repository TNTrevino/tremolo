# Note Game Feature

This feature handles the note identification game functionality where students practice recognizing musical notes.

## Directory Structure

### Components (323 lines total)
- **GameSettings.tsx** (115 lines) - Game configuration UI (mode, limits, scale, octave)
- **GameBoard.tsx** (100 lines) - Active gameplay UI (score bar, note display, answer buttons)
- **GameResults.tsx** (108 lines) - Post-game statistics and charts
- **index.ts** (11 lines) - Component exports

### Hooks (225 lines total)
- **useNoteGame.ts** (159 lines) - Core game logic (state management, note generation, scoring)
- **useGameTimer.ts** (60 lines) - Timer management for time mode
- **index.ts** (6 lines) - Hook exports

### Types (46 lines)
- **index.ts** (46 lines) - Game types, constants (GameSettings, SCALES, NOTES, ACCIDENTALS)

### Main Files
- **index.ts** (15 lines) - Feature module exports
- **README.md** - Feature documentation

## Architecture

### Separation of Concerns
- **Hooks**: All game logic (state, note generation, scoring, timing)
- **Components**: Pure presentational UI (settings, board, results)
- **Types**: Shared type definitions and constants
- **Page**: Thin orchestrator layer (~91 lines, down from 388 lines)

### Key Features
- Two game modes: Time mode (countdown) and Notes mode (fixed count)
- Configurable settings: Scale, octave, time/note limits
- Real-time scoring and accuracy tracking
- Statistics calculation (NPM - Notes Per Minute)
- Performance charts for authenticated users
- Backend integration ready (useGenerateNoteGame hook from @/shared/hooks/queries/useMusicQuery)

## Related Files

- Pages: `src/pages/NoteGamePage.tsx` (91 lines)
- Backend Integration: `src/shared/hooks/queries/useMusicQuery.ts` (useGenerateNoteGame)
- Shared Types: `src/shared/types/game.types.ts`

## Usage Example

```tsx
import { useNoteGame, useGameTimer, GameSettings, GameBoard, GameResults } from '@/features/note-game';

function MyGamePage() {
  const {
    gameState,
    currentNote,
    answers,
    settings,
    updateSettings,
    startGame,
    handleAnswer,
    endGame,
    resetGame
  } = useNoteGame();

  const { timeRemaining, startTimer, formatTime } = useGameTimer(() => endGame());

  // Render appropriate component based on gameState
}
